// src/pages/PainelSecretaria.js
import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

export default function PainelSecretaria() {
  const [envio, setEnvio] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  
  // Estados para configuração de médico
  const [mostrarConfigMedico, setMostrarConfigMedico] = useState(false);
  const [medicosPredefinidos, setMedicosPredefinidos] = useState([]);
  const [medicosDisponiveis, setMedicosDisponiveis] = useState([]);
  const [enviosSelecionados, setEnviosSelecionados] = useState([]);

  // Função para registrar logs
  const registrarLog = async (tipo, detalhes = {}) => {
    try {
      await addDoc(collection(db, "logs"), {
        tipo,
        usuario: usuario?.nome || usuario?.email || 'usuário desconhecido',
        timestamp: Timestamp.now(),
        detalhes,
        painel: 'secretaria'
      });
    } catch (error) {
      console.error("Erro ao registrar log:", error);
    }
  };
  const [editandoPedido, setEditandoPedido] = useState(null);
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [novaObservacao, setNovaObservacao] = useState('');
  const [pesquisaMedico, setPesquisaMedico] = useState('');
  
  // Estados para o modal de novo pedido
  const [mostrarNovoPedido, setMostrarNovoPedido] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);
  const [quantidadePedido, setQuantidadePedido] = useState('');
  const [observacaoPedido, setObservacaoPedido] = useState('');
  const [areasNaoAtende, setAreasNaoAtende] = useState([]);
  
  const navigate = useNavigate();

  // Áreas disponíveis (todas as áreas da Otorrinolaringologia)
  const areasDisponiveis = ['Ouvido', 'Nariz', 'Garganta'];

  const carregarUsuario = async (user) => {
    if (!user) {
      navigate("/");
      return;
    }

    try {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUsuario(snap.data());
        carregarEnviosAtivos(user.uid);
      } else {
        alert("Usuário não encontrado no banco de dados");
        navigate("/");
      }
    } catch (error) {
      alert("Erro ao carregar dados do usuário. Tente fazer login novamente.");
      navigate("/");
    } finally {
      setCarregando(false);
    }
  };

  const carregarEnviosAtivos = (userId) => {
    console.log("Carregando envios para usuário:", userId);
    const q = query(
      collection(db, "envios"), 
      where("secretariaId", "==", userId),
      where("status", "==", "aberto")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const envios = [];
      snapshot.forEach((doc) => {
        envios.push({ id: doc.id, ...doc.data() });
      });
      console.log("Envios ativos encontrados:", envios);
      setEnviosSelecionados(envios);
    });
    
    return unsubscribe;
  };

  const solicitarMais = async () => {
    const quantia = prompt("Quantos pacientes adicionais deseja solicitar?");
    if (quantia && !isNaN(quantia) && parseInt(quantia) > 0 && envio) {
      try {
        await updateDoc(doc(db, "envios", envio.id), {
          quantidade: envio.quantidade + parseInt(quantia),
        });
        // Interface já atualiza automaticamente via listener
      } catch (error) {
        alert("Erro ao solicitar pacientes adicionais. Tente novamente.");
      }
    } else if (quantia) {
      alert("Por favor, insira um número válido de pacientes");
    }
  };

  const solicitarPacientes = async () => {
    setMostrarNovoPedido(true);
    carregarMedicosPredefinidos();
  };

  const criarPedidoParaMedico = async (medico, quantidade, observacao = '') => {
    if (!usuario) return;

    try {
      await addDoc(collection(db, "envios"), {
        medico: medico.nome,
        medicoId: medico.id,
        secretariaId: auth.currentUser.uid,
        secretariaNome: usuario.nome,
        especialidade: "Otorrinolaringologista",
        areasAtendidas: ["Ouvido", "Nariz", "Garganta"],
        naoAtende: medico.naoAtende || [],
        observacao: observacao,
        quantidade: parseInt(quantidade),
        criado_em: Timestamp.now(),
        status: "aberto",
      });

      // Marcar médico como em uso
      await updateDoc(doc(db, "medicos", medico.id), {
        emUso: true,
        secretariaAtual: auth.currentUser.uid,
        ultimoUso: Timestamp.now()
      });

      // Registrar log
      await registrarLog('pedido_criado', {
        medico: medico.nome,
        medicoId: medico.id,
        quantidade: parseInt(quantidade),
        observacao: observacao || 'Sem observação'
      });

      console.log("Pedido criado com sucesso para:", medico.nome);
      setMostrarConfigMedico(false);
      setMostrarNovoPedido(false);
      setPesquisaMedico('');
      limparModalNovoPedido();
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao enviar solicitação. Tente novamente.");
    }
  };

  const cancelarPedido = async (envio) => {
    if (!envio) {
      alert("Nenhum pedido ativo para cancelar");
      return;
    }

    if (window.confirm(`Deseja realmente cancelar o pedido de ${envio.quantidade} paciente(s) para ${envio.medico}?`)) {
      setCancelando(true);
      try {
        await updateDoc(doc(db, "envios", envio.id), {
          status: "cancelado",
          dataCancelamento: Timestamp.now()
        });

        // Liberar médico
        await updateDoc(doc(db, "medicos", envio.medicoId), {
          emUso: false,
          secretariaAtual: null
        });

        // Registrar log
        await registrarLog('pedido_cancelado', {
          medico: envio.medico,
          medicoId: envio.medicoId,
          quantidade: envio.quantidade,
          observacao: envio.observacao || 'Sem observação'
        });

        console.log("Pedido cancelado e médico liberado");
      } catch (error) {
        console.error("Erro ao cancelar:", error);
        alert("Erro ao cancelar pedido. Tente novamente.");
      } finally {
        setCancelando(false);
      }
    }
  };

  // ===== FUNÇÕES PARA CONFIGURAÇÃO DE MÉDICO =====
  
  // Verificar quais médicos têm pedidos abertos
  const verificarMedicosComPedidosAbertos = async (medicos) => {
    try {
      // Buscar todos os pedidos abertos
      const q = query(
        collection(db, "envios"),
        where("status", "==", "aberto")
      );
      
      const querySnapshot = await getDocs(q);
      const medicosComPedidoAberto = new Set();
      
      querySnapshot.forEach((doc) => {
        const pedido = doc.data();
        if (pedido.medicoId) {
          medicosComPedidoAberto.add(pedido.medicoId);
        }
      });
      
      // Adicionar status de pedido aberto aos médicos
      return medicos.map(medico => ({
        ...medico,
        temPedidoAberto: medicosComPedidoAberto.has(medico.id)
      }));
    } catch (error) {
      console.error("Erro ao verificar pedidos abertos:", error);
      return medicos.map(medico => ({ ...medico, temPedidoAberto: false }));
    }
  };
  
  // Carregar médicos pré-definidos
  const carregarMedicosPredefinidos = async () => {
    try {
      console.log("Iniciando carregamento de médicos...");
      const querySnapshot = await getDocs(collection(db, "medicos"));
      console.log("Snapshot recebido:", querySnapshot);
      console.log("Número de documentos:", querySnapshot.size);
      
      const medicos = [];
      querySnapshot.forEach((doc) => {
        console.log("Documento encontrado:", doc.id, doc.data());
        medicos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log("Médicos carregados:", medicos);
      setMedicosPredefinidos(medicos);
      
      // Verificar quais médicos têm pedidos abertos
      const medicosComStatus = await verificarMedicosComPedidosAbertos(medicos);
      
      // Filtrar médicos disponíveis (sem pedidos abertos)
      const disponveis = medicosComStatus.filter(medico => !medico.temPedidoAberto);
      setMedicosDisponiveis(disponveis);
      
      // Se não há médicos, vamos criar alguns de exemplo
      if (medicos.length === 0) {
        console.log("Nenhum médico encontrado. Criando médicos de exemplo...");
        await criarMedicosExemplo();
      }
    } catch (error) {
      console.error("Erro ao carregar médicos:", error);
      alert("Erro ao carregar lista de médicos: " + error.message);
    }
  };

  // Criar médicos de exemplo se não existirem
  const criarMedicosExemplo = async () => {
    try {
      const medicosExemplo = [
        {
          nome: "Dr. João Silva",
          crm: "12345-SP",
          especialidade: "Otorrinolaringologista",
          ativo: true,
          emUso: false,
          naoAtende: []
        },
        {
          nome: "Dra. Maria Santos",
          crm: "67890-SP", 
          especialidade: "Otorrinolaringologista",
          ativo: true,
          emUso: false,
          naoAtende: []
        },
        {
          nome: "Dr. Pedro Lima",
          crm: "11111-SP",
          especialidade: "Otorrinolaringologista", 
          ativo: true,
          emUso: false,
          naoAtende: []
        }
      ];

      for (const medico of medicosExemplo) {
        await addDoc(collection(db, "medicos"), {
          ...medico,
          criadoEm: Timestamp.now()
        });
      }

      console.log("Médicos de exemplo criados!");
      // Recarregar a lista
      carregarMedicosPredefinidos();
    } catch (error) {
      console.error("Erro ao criar médicos de exemplo:", error);
    }
  };

  // Abrir modal de configuração
  const abrirConfigMedico = () => {
    carregarMedicosPredefinidos();
    setMostrarConfigMedico(true);
  };

  // Fechar modal de configuração
  const fecharConfigMedico = () => {
    setMostrarConfigMedico(false);
    setPesquisaMedico('');
  };

  // Solicitar pedido para médico específico
  const solicitarParaMedico = async (medico) => {
    try {
      // Verificar se o médico já tem um pedido aberto
      const q = query(
        collection(db, "envios"),
        where("medicoId", "==", medico.id),
        where("status", "==", "aberto")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert(`❌ O médico ${medico.nome} já possui um pedido aberto em andamento. Não é possível criar outro pedido até que o atual seja concluído.`);
        return;
      }

      const quantidade = prompt(`Quantos pacientes deseja solicitar para ${medico.nome}?`);
      if (quantidade && !isNaN(quantidade) && parseInt(quantidade) > 0) {
        const observacao = prompt("Observações (opcional):");
        criarPedidoParaMedico(medico, quantidade, observacao || '');
      } else if (quantidade) {
        alert("Por favor, insira um número válido de pacientes");
      }
    } catch (error) {
      console.error("Erro ao verificar status do médico:", error);
      alert("Erro ao verificar disponibilidade do médico. Tente novamente.");
    }
  };

  // Abrir edição de pedido
  const abrirEdicaoPedido = (envio) => {
    setEditandoPedido(envio);
    setNovaQuantidade(envio.quantidade.toString());
    setNovaObservacao(envio.observacao || '');
  };

  // Fechar edição de pedido
  const fecharEdicaoPedido = () => {
    setEditandoPedido(null);
    setNovaQuantidade('');
    setNovaObservacao('');
  };

  // Salvar edição de pedido
  const salvarEdicaoPedido = async () => {
    if (!editandoPedido || !novaQuantidade || parseInt(novaQuantidade) <= 0) {
      alert("Informe uma quantidade válida");
      return;
    }

    try {
      await updateDoc(doc(db, "envios", editandoPedido.id), {
        quantidade: parseInt(novaQuantidade),
        observacao: novaObservacao.trim(),
        editadoEm: Timestamp.now()
      });

      fecharEdicaoPedido();
      alert("Pedido atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido. Tente novamente.");
    }
  };

  // Filtrar médicos disponíveis por pesquisa
  const medicosDisponiveisFiltrados = medicosDisponiveis.filter(medico =>
    medico.nome.toLowerCase().includes(pesquisaMedico.toLowerCase()) ||
    medico.crm?.toLowerCase().includes(pesquisaMedico.toLowerCase())
  );

  // ===== FUNÇÕES PARA NOVO PEDIDO =====
  
  // Limpar dados do modal de novo pedido
  const limparModalNovoPedido = () => {
    setMedicoSelecionado(null);
    setQuantidadePedido('');
    setObservacaoPedido('');
    setAreasNaoAtende([]);
    setPesquisaMedico('');
  };

  // Fechar modal de novo pedido
  const fecharNovoPedido = () => {
    setMostrarNovoPedido(false);
    limparModalNovoPedido();
  };

  // Selecionar médico no modal
  const selecionarMedico = (medico) => {
    setMedicoSelecionado(medico);
    setAreasNaoAtende(medico.naoAtende || []);
  };

  // Toggle área que não atende
  const toggleAreaNaoAtende = (area) => {
    setAreasNaoAtende(prev => {
      if (prev.includes(area)) {
        return prev.filter(a => a !== area);
      } else {
        return [...prev, area];
      }
    });
  };

  // Criar pedido com configurações do modal
  const criarPedidoDoModal = async () => {
    if (!medicoSelecionado) {
      alert("Selecione um médico");
      return;
    }
    
    if (!quantidadePedido || parseInt(quantidadePedido) <= 0) {
      alert("Informe uma quantidade válida");
      return;
    }

    try {
      // Verificar se o médico já tem um pedido aberto
      const q = query(
        collection(db, "envios"),
        where("medicoId", "==", medicoSelecionado.id),
        where("status", "==", "aberto")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert(`❌ O médico ${medicoSelecionado.nome} já possui um pedido aberto em andamento. Não é possível criar outro pedido até que o atual seja concluído.`);
        return;
      }

      // Atualizar o médico com as áreas que não atende
      await updateDoc(doc(db, "medicos", medicoSelecionado.id), {
        naoAtende: areasNaoAtende
      });

      // Criar o pedido
      const medicoAtualizado = { ...medicoSelecionado, naoAtende: areasNaoAtende };
      await criarPedidoParaMedico(medicoAtualizado, quantidadePedido, observacaoPedido);
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      alert("Erro ao criar pedido. Tente novamente.");
    }
  };

  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeEnvios;

    const initializeAuth = () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const ref = doc(db, "usuarios", user.uid);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const userData = snap.data();
              setUsuario(userData);
              
              // Configurar listener para os envios da secretária
              const q = query(
                collection(db, "envios"), 
                where("secretariaId", "==", user.uid),
                where("status", "==", "aberto")
              );
              
              unsubscribeEnvios = onSnapshot(q, (snapshot) => {
                const envios = [];
                snapshot.forEach((doc) => {
                  envios.push({ id: doc.id, ...doc.data() });
                });
                setEnviosSelecionados(envios);
              });
            } else {
              alert("Usuário não encontrado no banco de dados");
              navigate("/");
            }
          } catch (error) {
            alert("Erro ao carregar dados do usuário. Tente fazer login novamente.");
            navigate("/");
          }
        } else {
          navigate("/");
        }
        setCarregando(false);
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeEnvios) unsubscribeEnvios();
    };
  }, [navigate]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-sans">
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              👩‍💼 Painel da Secretária
            </h1>
            {usuario && (
              <div className="text-gray-600">
                <p className="mb-1">
                  Bem-vinda, <span className="font-semibold text-blue-600">{usuario.nome}</span>
                </p>
                
                {enviosSelecionados.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-sm font-bold text-green-600 mr-1 flex items-center">MÉDICOS ATIVOS:</span>
                    {enviosSelecionados.map((envio, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-bold border-2 border-green-400 shadow-sm"
                      >
                        👨‍⚕️ {envio.medico}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/")}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Aviso de configuração necessária */}
      {usuario && enviosSelecionados.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
            <div>
              <h2 className="text-xl font-semibold text-yellow-800">Nenhum Pedido Ativo</h2>
              <p className="text-yellow-700">Você não possui pedidos ativos. Clique abaixo para fazer um novo pedido.</p>
            </div>
          </div>
          <button
            onClick={solicitarPacientes}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            🏥 Fazer Novo Pedido
          </button>
        </div>
      )}

      {/* Lista de Pedidos Ativos */}
      {enviosSelecionados.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              📋 Pedidos Ativos ({enviosSelecionados.length})
            </h2>
            <button
              onClick={solicitarPacientes}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              ➕ Novo Pedido
            </button>
          </div>

          {enviosSelecionados.map((envio) => (
            <div key={envio.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-r-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      ✅ Pedido Ativo
                    </h3>
                    <div className="text-gray-700">
                      <p className="mb-2">
                        <span className="font-medium">Médico:</span> {envio.medico}
                        <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          Otorrinolaringologista
                        </span>
                      </p>
                      
                      {envio.naoAtende && envio.naoAtende.length > 0 && (
                        <p className="mb-2">
                          <span className="font-bold text-red-600 flex items-center mb-1">🚫 NÃO ATENDE:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {envio.naoAtende.map((area, index) => (
                              <span
                                key={index}
                                className="bg-red-100 text-red-800 px-3 py-1 rounded-lg text-sm font-bold border-2 border-red-400 shadow-sm"
                              >
                                ❌ {area}
                              </span>
                            ))}
                          </div>
                        </p>
                      )}
                      
                      {envio.observacao && (
                        <p className="mb-2">
                          <span className="font-medium">Observação:</span>
                          <span className="ml-2 text-gray-600 italic">{envio.observacao}</span>
                        </p>
                      )}
                      
                      <p className="mb-1">
                        <span className="font-medium">Quantidade:</span> 
                        <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                          {envio.quantidade} paciente{envio.quantidade > 1 ? "s" : ""}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Criado em: {envio.criado_em?.toDate().toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => abrirEdicaoPedido(envio)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    ✏️ Editar Pedido
                  </button>
                  <button
                    onClick={() => cancelarPedido(envio)}
                    disabled={cancelando}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      cancelando 
                        ? "bg-gray-400 cursor-not-allowed text-white" 
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {cancelando ? "⏳ Cancelando..." : "❌ Cancelar Pedido"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informações Úteis */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          💡 Informações
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">📝 Como solicitar</h3>
            <p className="text-sm text-blue-700">
              Clique em "Solicitar Pacientes" e informe a quantidade desejada. 
              O pedido será enviado automaticamente para o Pronto Atendimento.
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">➕ Solicitar mais</h3>
            <p className="text-sm text-orange-700">
              Se precisar de mais pacientes durante um pedido ativo, 
              use "Solicitar Mais" para adicionar à quantidade atual.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Médico */}
      {mostrarConfigMedico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  👨‍⚕️ Selecionar Médico para Pedido
                </h2>
                <button
                  onClick={fecharConfigMedico}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Pesquisa e Seleção de Médico */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  🔍 Médicos Disponíveis
                </h3>
                
                {/* Campo de pesquisa */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Digite o nome ou CRM do médico..."
                    value={pesquisaMedico}
                    onChange={(e) => setPesquisaMedico(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>

                {/* Lista de médicos */}
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {medicosDisponiveis.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="text-4xl mb-3">👨‍⚕️</div>
                      <p className="text-gray-600 mb-4">Nenhum médico disponível encontrado.</p>
                      <button
                        onClick={criarMedicosExemplo}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        🏥 Criar Médicos de Exemplo
                      </button>
                    </div>
                  ) : medicosDisponiveisFiltrados.length > 0 ? (
                    medicosDisponiveisFiltrados.map(medico => (
                      <div
                        key={medico.id}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              👨‍⚕️ {medico.nome}
                            </h4>
                            {medico.crm && (
                              <p className="text-sm text-gray-600">CRM: {medico.crm}</p>
                            )}
                            <div className="mt-2">
                              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                ✅ Disponível
                              </span>
                              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Otorrinolaringologista
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => solicitarParaMedico(medico)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              🏥 Fazer Pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {pesquisaMedico ? 
                        `Nenhum médico disponível encontrado para "${pesquisaMedico}"` : 
                        "Digite para pesquisar médicos..."
                      }
                    </div>
                  )}
                </div>
              </div>

              {medicosDisponiveis.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    ℹ️ Informação sobre Disponibilidade
                  </h4>
                  <div className="text-blue-700 text-sm space-y-1">
                    <p>• ✅ <strong>Médicos Disponíveis:</strong> Podem receber novos pedidos</p>
                    <p>• 🚫 <strong>Médicos com Pedidos Ativos:</strong> Já possuem pedidos em andamento e não podem receber novos até que sejam concluídos</p>
                    <p>• 🔒 <strong>Exclusividade:</strong> Cada médico pode ter apenas um pedido ativo por vez, independente da secretária</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Pedido */}
      {mostrarNovoPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  🏥 Criar Novo Pedido
                </h2>
                <button
                  onClick={fecharNovoPedido}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Lado Esquerdo - Seleção de Médico */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    👨‍⚕️ Selecionar Médico
                  </h3>
                  
                  {/* Campo de pesquisa */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Digite o nome ou CRM do médico..."
                      value={pesquisaMedico}
                      onChange={(e) => setPesquisaMedico(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                  </div>

                  {/* Lista de médicos */}
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {medicosPredefinidos.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="text-4xl mb-3">👨‍⚕️</div>
                        <p className="text-gray-600 mb-4">Nenhum médico encontrado.</p>
                        <button
                          onClick={criarMedicosExemplo}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          🏥 Criar Médicos de Exemplo
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Médicos Disponíveis */}
                        {medicosDisponiveisFiltrados.length > 0 && (
                          <div>
                            <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                              <h4 className="font-semibold text-green-800 text-sm">
                                ✅ MÉDICOS DISPONÍVEIS
                              </h4>
                            </div>
                            {medicosDisponiveisFiltrados.map(medico => (
                              <div
                                key={medico.id}
                                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                                  medicoSelecionado?.id === medico.id 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => selecionarMedico(medico)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">
                                      👨‍⚕️ {medico.nome}
                                    </h4>
                                    {medico.crm && (
                                      <p className="text-sm text-gray-600">CRM: {medico.crm}</p>
                                    )}
                                    <div className="mt-2">
                                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        ✅ Disponível
                                      </span>
                                      <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        Otorrinolaringologista
                                      </span>
                                    </div>
                                  </div>
                                  {medicoSelecionado?.id === medico.id && (
                                    <div className="ml-4">
                                      <span className="text-blue-600 font-bold">✓ Selecionado</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Médicos Ocupados */}
                        {medicosPredefinidos.filter(medico => 
                          medico.temPedidoAberto && 
                          (medico.nome.toLowerCase().includes(pesquisaMedico.toLowerCase()) ||
                           medico.crm?.toLowerCase().includes(pesquisaMedico.toLowerCase()))
                        ).length > 0 && (
                          <div>
                            <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                              <h4 className="font-semibold text-red-800 text-sm">
                                🚫 MÉDICOS COM PEDIDOS ATIVOS
                              </h4>
                            </div>
                            {medicosPredefinidos
                              .filter(medico => 
                                medico.temPedidoAberto && 
                                (medico.nome.toLowerCase().includes(pesquisaMedico.toLowerCase()) ||
                                 medico.crm?.toLowerCase().includes(pesquisaMedico.toLowerCase()))
                              )
                              .map(medico => (
                                <div
                                  key={medico.id}
                                  className="p-4 border-b border-gray-100 bg-red-50 opacity-60"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-800">
                                        👨‍⚕️ {medico.nome}
                                      </h4>
                                      {medico.crm && (
                                        <p className="text-sm text-gray-600">CRM: {medico.crm}</p>
                                      )}
                                      <div className="mt-2">
                                        <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                          🚫 Com Pedido Ativo
                                        </span>
                                        <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                          Indisponível
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <span className="text-red-600 font-bold">❌ Ocupado</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}

                        {/* Nenhum médico encontrado na pesquisa */}
                        {medicosDisponiveisFiltrados.length === 0 && 
                         medicosPredefinidos.filter(medico => 
                           medico.temPedidoAberto && 
                           (medico.nome.toLowerCase().includes(pesquisaMedico.toLowerCase()) ||
                            medico.crm?.toLowerCase().includes(pesquisaMedico.toLowerCase()))
                         ).length === 0 && 
                         pesquisaMedico && (
                          <div className="p-4 text-center text-gray-500">
                            Nenhum médico encontrado para "{pesquisaMedico}"
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Lado Direito - Configurações do Pedido */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">
                    ⚙️ Configurações do Pedido
                  </h3>

                  {medicoSelecionado ? (
                    <div className="space-y-4">
                      {/* Médico selecionado */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          Médico Selecionado:
                        </h4>
                        <p className="text-blue-700">👨‍⚕️ {medicoSelecionado.nome}</p>
                        {medicoSelecionado.crm && (
                          <p className="text-sm text-blue-600">CRM: {medicoSelecionado.crm}</p>
                        )}
                      </div>

                      {/* Áreas que NÃO atende */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🚫 Áreas que o médico NÃO atende:
                        </label>
                        <div className="space-y-2">
                          {areasDisponiveis.map(area => (
                            <label key={area} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={areasNaoAtende.includes(area)}
                                onChange={() => toggleAreaNaoAtende(area)}
                                className="mr-2 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                              <span className={`text-sm ${
                                areasNaoAtende.includes(area) 
                                  ? 'text-red-600 font-medium' 
                                  : 'text-gray-700'
                              }`}>
                                {areasNaoAtende.includes(area) ? '❌' : '✅'} {area}
                              </span>
                            </label>
                          ))}
                        </div>
                        {areasNaoAtende.length > 0 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs text-red-600">
                              ⚠️ Áreas marcadas não serão atendidas por este médico
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quantidade */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantidade de Pacientes:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={quantidadePedido}
                          onChange={(e) => setQuantidadePedido(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 5"
                        />
                      </div>

                      {/* Observação */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Observação:
                        </label>
                        <textarea
                          value={observacaoPedido}
                          onChange={(e) => setObservacaoPedido(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="Observações sobre o pedido (opcional)"
                        />
                      </div>

                      {/* Botões */}
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={criarPedidoDoModal}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          🏥 Criar Pedido
                        </button>
                        <button
                          onClick={fecharNovoPedido}
                          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">👈</div>
                      <p className="text-gray-500">
                        Selecione um médico na lista ao lado para continuar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Pedido */}
      {editandoPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  ✏️ Editar Pedido
                </h2>
                <button
                  onClick={fecharEdicaoPedido}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Médico (não editável) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Médico:
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="font-medium text-gray-800">👨‍⚕️ {editandoPedido.medico}</p>
                  </div>
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade de Pacientes:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={novaQuantidade}
                    onChange={(e) => setNovaQuantidade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 5"
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observação:
                  </label>
                  <textarea
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Observações sobre o pedido (opcional)"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={salvarEdicaoPedido}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    💾 Salvar Alterações
                  </button>
                  <button
                    onClick={fecharEdicaoPedido}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}