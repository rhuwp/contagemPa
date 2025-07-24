// src/pages/PainelPA.js

import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import {
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function PainelPA() {
  // Estados de autenticação simplificados
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados existentes
  const [envios, setEnvios] = useState([]);
  const [mudancasPendentes, setMudancasPendentes] = useState({});
  const [decrementouNesteTurno, setDecrementouNesteTurno] = useState(false);
  const [quantidadeEnvio, setQuantidadeEnvio] = useState({}); // Novo estado para controlar quantidade
  
  // Estados para o modal de exceção
  const [mostrarModalExcecao, setMostrarModalExcecao] = useState(false);
  const [medicoSelecionadoExcecao, setMedicoSelecionadoExcecao] = useState(null);
  const [dadosExcecao, setDadosExcecao] = useState({
    quantidade: 1,
    justificativa: ''
  });

  // Verificar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "prontoatendimento@ipo.com.br") {
        setIsLoggedIn(true);
        console.log("✅ Usuário PA autenticado:", user.email);
      } else {
        setIsLoggedIn(false);
        if (user) {
          console.log("❌ Email não autorizado para PA:", user.email);
          // Redirecionar para login se não for o email correto
          navigate("/login");
        } else {
          // Usuário não logado, redirecionar para login
          navigate("/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Função de logout
  const handleLogout = async () => {
    try {
      await registrarLog("pa_logout", {
        email: auth.currentUser?.email,
        timestamp: new Date().toISOString()
      });
      
      await signOut(auth);
      console.log("✅ Logout PA realizado");
    } catch (error) {
      console.error("❌ Erro no logout PA:", error);
    }
  };

  // Função para registrar logs
  const registrarLog = async (tipo, detalhes = {}) => {
    try {
      await addDoc(collection(db, "logs"), {
        tipo,
        usuario: 'Pronto Atendimento',
        timestamp: Timestamp.now(),
        detalhes,
        painel: 'pronto_atendimento'
      });
    } catch (error) {
      console.error("Erro ao registrar log:", error);
    }
  };

  // Funções para modal de exceção
  const abrirModalExcecao = (envio) => {
    setMedicoSelecionadoExcecao(envio);
    setDadosExcecao({
      quantidade: 1,
      justificativa: ''
    });
    setMostrarModalExcecao(true);
  };

  const fecharModalExcecao = () => {
    setMostrarModalExcecao(false);
    setMedicoSelecionadoExcecao(null);
    setDadosExcecao({
      quantidade: 1,
      justificativa: ''
    });
  };

  const enviarExcecao = async () => {
    if (!dadosExcecao.justificativa.trim()) {
      alert("Por favor, informe a justificativa para o envio por exceção.");
      return;
    }

    if (dadosExcecao.quantidade < 1) {
      alert("A quantidade deve ser pelo menos 1.");
      return;
    }

    if (dadosExcecao.quantidade > medicoSelecionadoExcecao.quantidade) {
      alert(`Não é possível atender ${dadosExcecao.quantidade} paciente(s) por exceção. O médico possui apenas ${medicoSelecionadoExcecao.quantidade} paciente(s) na fila.`);
      return;
    }

    try {
      const envioAtual = medicoSelecionadoExcecao;
      const posicaoAtual = envios.findIndex(e => e.id === envioAtual.id) + 1;
      
      // Calcular nova quantidade (diminui os pacientes como se fossem atendidos por exceção)
      const quantidadeAtendidaPorExcecao = parseInt(dadosExcecao.quantidade);
      const novaQuantidade = Math.max(0, envioAtual.quantidade - quantidadeAtendidaPorExcecao);
      
      // Calcular nova posição na fila (final da fila)
      // Pega o maior ordemTurno atual e adiciona um incremento
      const maiorOrdem = Math.max(...envios.map(e => e.ordemTurno || e.criado_em?.toMillis() || 0));
      const novaOrdemTurno = maiorOrdem + 1000; // Incremento para garantir que fica no final

      // Atualizar o envio no Firebase
      await updateDoc(doc(db, "envios", envioAtual.id), {
        quantidade: novaQuantidade,
        ordemTurno: novaOrdemTurno,
        ultimaAtualizacao: Timestamp.now()
      });

      // Registrar log da exceção
      await registrarLog('excecao_enviada', {
        medico: envioAtual.medico,
        medicoId: envioAtual.medicoId,
        quantidadeAnterior: envioAtual.quantidade,
        quantidadeAtendida: quantidadeAtendidaPorExcecao,
        quantidadeRestante: novaQuantidade,
        justificativa: dadosExcecao.justificativa,
        posicaoAnterior: posicaoAtual,
        novaPosicao: "Final da fila"
      });

      alert(`Exceção registrada! ${quantidadeAtendidaPorExcecao} paciente(s) atendido(s) por ${envioAtual.medico} por exceção.\nO médico foi movido para o final da fila com ${novaQuantidade} paciente(s) restante(s).`);
      fecharModalExcecao();
    } catch (error) {
      console.error("Erro ao registrar exceção:", error);
      alert("Erro ao registrar exceção. Tente novamente.");
    }
  };

  const colecaoEnvios = collection(db, "envios");

  const carregarEnvios = () => {
    // Filtra apenas envios com status "aberto" e escuta mudanças em tempo real
    const q = query(colecaoEnvios, where("status", "==", "aberto"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Ordena por ordem de turno (ordemTurno) e depois por criação
      lista.sort((a, b) => {
        const ordemA = a.ordemTurno || a.criado_em?.toMillis() || 0;
        const ordemB = b.ordemTurno || b.criado_em?.toMillis() || 0;
        return ordemA - ordemB;
      });
      setEnvios(lista);
    });
    return unsubscribe;
  };

  const atualizarEnvio = async (id) => {
    const novoValor = prompt("Nova quantidade:");
    if (novoValor && !isNaN(novoValor) && parseInt(novoValor) >= 0) {
      try {
        await updateDoc(doc(db, "envios", id), {
          quantidade: parseInt(novoValor),
        });
      } catch (error) {
        alert("Erro ao atualizar envio. Tente novamente.");
      }
    } else if (novoValor) {
      alert("Por favor, insira um número válido.");
    }
  };

  const decrementarPaciente = (id, quantidade = 1) => {
    const envioAtual = envios.find(e => e.id === id);
    const quantidadeAtual = mudancasPendentes[id] !== undefined ? mudancasPendentes[id] : envioAtual.quantidade;
    
    // Só permite decrementar se for o primeiro da fila
    const isPrimeiro = envios[0]?.id === id;
    if (!isPrimeiro) {
      return; // Não faz nada se não for o primeiro
    }
    
    // Verifica se já decrementou neste turno
    if (decrementouNesteTurno) {
      return; // Já decrementou, não pode decrementar novamente
    }
    
    // Garante que não decremente mais do que tem disponível
    const quantidadeParaDecrementar = Math.min(quantidade, quantidadeAtual);
    
    if (quantidadeAtual > 0 && quantidadeParaDecrementar > 0) {
      const novaQuantidade = quantidadeAtual - quantidadeParaDecrementar;
      setMudancasPendentes(prev => ({
        ...prev,
        [id]: novaQuantidade
      }));
      // Só marca que decrementou se realmente decrementou
      setDecrementouNesteTurno(true);
    }
  };

  const salvarEnvio = async (id) => {
    try {
      const novaQuantidade = mudancasPendentes[id];
      const envioAtual = envios.find(e => e.id === id);
      
      if (novaQuantidade !== undefined) {
        const quantidadeEnviada = envioAtual.quantidade - novaQuantidade;
        
        // Salva a mudança pendente no banco
        await updateDoc(doc(db, "envios", id), {
          quantidade: novaQuantidade
        });

        // Registrar log do envio de pacientes
        await registrarLog('pacientes_enviados', {
          medico: envioAtual.medico,
          medicoId: envioAtual.medicoId,
          quantidadeEnviada: quantidadeEnviada,
          quantidadeRestante: novaQuantidade,
          quantidadeOriginal: envioAtual.quantidade
        });
        
        // Remove da lista de mudanças pendentes
        setMudancasPendentes(prev => {
          const novas = { ...prev };
          delete novas[id];
          return novas;
        });
        
        if (novaQuantidade === 0) {
          // Se chegou a zero, finaliza o envio
          await updateDoc(doc(db, "envios", id), {
            status: "concluido",
            dataFinalizacao: Timestamp.now()
          });

          // Registrar log da finalização
          await registrarLog('envio_finalizado', {
            medico: envioAtual.medico,
            medicoId: envioAtual.medicoId,
            quantidadeTotalEnviada: envioAtual.quantidade
          });

          // Reseta o flag pois o envio foi finalizado
          setDecrementouNesteTurno(false);
        } else {
          // Como só há decrementos, sempre vai para o final da fila
          const novaOrdem = Timestamp.now().toMillis();
          await updateDoc(doc(db, "envios", id), {
            ordemTurno: novaOrdem
          });
          // Reseta o flag pois o médico vai para o final da fila
          setDecrementouNesteTurno(false);
        }
      } else {
        // Se não há mudanças pendentes, verifica se pode finalizar
        if (envioAtual && envioAtual.quantidade === 0) {
          await updateDoc(doc(db, "envios", id), {
            status: "concluido",
            dataFinalizacao: Timestamp.now()
          });

          await registrarLog('envio_finalizado', {
            medico: envioAtual.medico,
            medicoId: envioAtual.medicoId,
            quantidadeTotalEnviada: envioAtual.quantidade || 0
          });

          setDecrementouNesteTurno(false);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const passarAVez = async (id) => {
    const envioAtual = envios.find(e => e.id === id);
    const isPrimeiro = envios[0]?.id === id;
    
    if (!isPrimeiro) {
      return; // Só o primeiro pode passar a vez
    }
    
    // Verifica se há pelo menos 2 médicos na fila
    if (envios.length < 2) {
      alert("Não há outros médicos na fila para trocar de posição.");
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja passar a vez do Dr(a) ${envioAtual.medico}? O médico cairá uma posição na fila.`)) {
      try {
        // Pega o segundo médico da fila (que vai assumir a primeira posição)
        const segundoMedico = envios[1];
        
        // Calcula uma nova ordem que coloque o médico atual entre o segundo e o terceiro
        // Se houver um terceiro médico, usa a ordem entre eles
        // Se não, usa a ordem do segundo + um pequeno incremento
        let novaOrdem;
        
        if (envios.length >= 3) {
          // Há pelo menos 3 médicos: coloca entre o 2º e 3º
          const segundaOrdem = segundoMedico.ordemTurno || segundoMedico.criado_em?.toMillis() || 0;
          const terceiraOrdem = envios[2].ordemTurno || envios[2].criado_em?.toMillis() || 0;
          
          // Calcula o meio termo entre as duas ordens
          novaOrdem = (segundaOrdem + terceiraOrdem) / 2;
          
          // Se as ordens são muito próximas, adiciona um pequeno incremento
          if (novaOrdem <= segundaOrdem) {
            novaOrdem = segundaOrdem + 1000; // 1 segundo de diferença
          }
        } else {
          // Há apenas 2 médicos: coloca o atual depois do segundo
          const segundaOrdem = segundoMedico.ordemTurno || segundoMedico.criado_em?.toMillis() || 0;
          novaOrdem = segundaOrdem + 1000; // 1 segundo depois
        }
        
        // Atualiza a ordem do médico atual
        await updateDoc(doc(db, "envios", id), {
          ordemTurno: novaOrdem
        });

        // Registrar log
        await registrarLog('passou_vez', {
          medico: envioAtual.medico,
          medicoId: envioAtual.medicoId,
          quantidadeRestante: envioAtual.quantidade,
          posicaoAnterior: 1,
          novaPosicao: 2
        });

        // Reseta o flag de decremento
        setDecrementouNesteTurno(false);        // Remove mudanças pendentes se houver
        setMudancasPendentes(prev => {
          const novas = { ...prev };
          delete novas[id];
          return novas;
        });
        
        // Remove também a quantidade de envio
        setQuantidadeEnvio(prev => {
          const novas = { ...prev };
          delete novas[id];
          return novas;
        });
        
      } catch (error) {
        console.error("Erro ao passar a vez:", error);
        alert("Erro ao passar a vez. Tente novamente.");
      }
    }
  };

  const cancelarMudancas = (id) => {
    // Como só há decrementos, sempre reseta o flag ao cancelar
    setDecrementouNesteTurno(false);
    
    setMudancasPendentes(prev => {
      const novas = { ...prev };
      delete novas[id];
      return novas;
    });
    
    // Limpa também a quantidade de envio
    setQuantidadeEnvio(prev => {
      const novas = { ...prev };
      delete novas[id];
      return novas;
    });
  };

  useEffect(() => {
    // Listener para envios
    const unsubEnvios = carregarEnvios();

    return () => {
      unsubEnvios();
    };
  }, []);

  // Reseta o flag quando a ordem da fila muda
  useEffect(() => {
    setDecrementouNesteTurno(false);
    // Reseta também as quantidades de envio
    setQuantidadeEnvio({});
  }, [envios[0]?.id]); // Monitora mudança do primeiro da fila

  // Funções para controlar quantidade de envio
  const incrementarQuantidadeEnvio = (id) => {
    const envioAtual = envios.find(e => e.id === id);
    const quantidadeAtual = mudancasPendentes[id] !== undefined ? mudancasPendentes[id] : envioAtual.quantidade;
    const quantidadeAtualEnvio = quantidadeEnvio[id] || 1;
    
    if (quantidadeAtualEnvio < quantidadeAtual) {
      setQuantidadeEnvio(prev => ({
        ...prev,
        [id]: quantidadeAtualEnvio + 1
      }));
    }
  };

  const decrementarQuantidadeEnvio = (id) => {
    const quantidadeAtualEnvio = quantidadeEnvio[id] || 1;
    
    if (quantidadeAtualEnvio > 1) {
      setQuantidadeEnvio(prev => ({
        ...prev,
        [id]: quantidadeAtualEnvio - 1
      }));
    }
  };

  const getQuantidadeEnvio = (id) => {
    return quantidadeEnvio[id] || 1;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-6 font-sans">
      {/* Tela de Loading ou Redirecionamento */}
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      )}

      {/* Mensagem de Redirecionamento */}
      {!loading && !isLoggedIn && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
            <div className="text-6xl mb-4">🏥</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Painel do Pronto Atendimento
            </h2>
            <p className="text-gray-600 mb-6">
              Para acessar este painel, você precisa fazer login com a conta autorizada.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-800">
                <strong>Acesso restrito:</strong> apenas prontoatendimento@ipo.com.br
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Ir para Tela de Login
            </button>
          </div>
        </div>
      )}

      {/* Painel Principal - só mostra se estiver logado */}
      {!loading && isLoggedIn && (
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  🏥 Painel do Pronto Atendimento
                </h1>
                <p className="text-gray-600">
                  Sistema de Fila Rotativa • {envios.length > 0 ? `Na vez: ${envios[0]?.medico}` : 'Nenhum envio ativo'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Desenvolvido por <span className="font-semibold text-orange-600">{process.env.REACT_APP_DEVELOPER || 'RHUAN Martins'}</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Envios ativos</div>
                  <div className="text-2xl font-bold text-orange-600">{envios.length}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Como funciona:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Apenas o primeiro da fila pode enviar pacientes</li>
            <li>• Use os botões + e - para escolher quantos pacientes enviar</li>
            <li>• Clique em "Enviar" para confirmar o envio</li>
            <li>• Após enviar, o médico vai para o final da fila</li>
            <li>• Use "Passar a vez" se não atender aquela especialidade</li>
            <li>• Clique em "Salvar" para confirmar as mudanças</li>
          </ul>
        </div>

        {/* Fila de Envios */}
        <div className="space-y-4">
          {envios.length > 0 ? (
            envios.map((e, index) => {
              const quantidadePendente = mudancasPendentes[e.id];
              const quantidadeExibida = quantidadePendente !== undefined ? quantidadePendente : e.quantidade;
              const temMudancas = quantidadePendente !== undefined;
              const isPrimeiro = index === 0;
              const posicaoFila = index + 1;
              
              return (
                <div
                  key={e.id}
                  className={`rounded-lg p-6 shadow-md transition-all ${
                    isPrimeiro 
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 ring-2 ring-green-200" 
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Status Badge */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          isPrimeiro 
                            ? "bg-green-600 text-white" 
                            : "bg-gray-400 text-white"
                        }`}>
                          {isPrimeiro ? "🎯 SUA VEZ" : `⏳ POSIÇÃO ${posicaoFila}`}
                        </span>
                        <div>
                          <h3 className={`text-xl font-semibold ${
                            isPrimeiro ? "text-green-700" : "text-gray-600"
                          }`}>
                            {e.medico}
                            {e.especialidade ? (
                              <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                                isPrimeiro 
                                  ? "bg-blue-100 text-blue-700" 
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {e.especialidade}
                              </span>
                            ) : (
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                isPrimeiro 
                                  ? "bg-gray-100 text-gray-500" 
                                  : "bg-gray-50 text-gray-400"
                              }`}>
                                Sem especialidade
                              </span>
                            )}
                          </h3>
                          {/* Áreas NÃO Atendidas */}
                          {e.naoAtende && e.naoAtende.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="text-sm font-bold text-red-600 mr-2 flex items-center">
                                 NÃO ATENDE:
                              </span>
                              {e.naoAtende.map((area, idx) => (
                                <span 
                                  key={idx}
                                  className={`px-3 py-1 rounded-lg text-sm font-bold border-1 shadow-sm ${
                                    isPrimeiro 
                                      ? "bg-red-100 text-red-800 border-red-400" 
                                      : "bg-red-50 text-red-700 border-red-300"
                                  }`}
                                >
                                  ❌ {area}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informações do Envio */}
                      <div className={`space-y-2 ${isPrimeiro ? "text-gray-800" : "text-gray-500"}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Pacientes restantes:</span>
                          <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                            quantidadeExibida > 0 
                              ? isPrimeiro 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {quantidadeExibida}
                          </span>
                        </div>

                        {/* Observações */}
                        {e.observacao ? (
                          <div className={`text-sm p-2 rounded ${
                            isPrimeiro 
                              ? "bg-orange-50 border border-orange-200 text-orange-700" 
                              : "bg-gray-50 border border-gray-200 text-gray-600"
                          }`}>
                            <span className="font-medium">💬 Observação:</span> {e.observacao}
                          </div>
                        ) : (
                          <div className={`text-sm p-2 rounded ${
                            isPrimeiro 
                              ? "bg-gray-50 border border-gray-200 text-gray-500" 
                              : "bg-gray-50 border border-gray-200 text-gray-400"
                          }`}>
                            <span className="font-medium">💬 Observação:</span> Nenhuma observação
                          </div>
                        )}
                        
                        {temMudancas && (
                          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-sm">
                            <span className="font-medium text-yellow-800">
                              ⚠️ Mudança pendente: {e.quantidade} → {quantidadePendente} 
                              ({e.quantidade - quantidadePendente} paciente{e.quantidade - quantidadePendente > 1 ? 's' : ''} enviado{e.quantidade - quantidadePendente > 1 ? 's' : ''})
                            </span>
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-400">
                          Solicitado em: {e.criado_em?.toDate().toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col gap-2 ml-6">
                      {/* Controles de Quantidade - só aparecem para o primeiro */}
                      {isPrimeiro && quantidadeExibida > 0 && !decrementouNesteTurno && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                          <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                            Pacientes a enviar:
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => decrementarQuantidadeEnvio(e.id)}
                              disabled={getQuantidadeEnvio(e.id) <= 1}
                              className={`w-8 h-8 rounded-full font-bold text-lg transition-colors ${
                                getQuantidadeEnvio(e.id) <= 1
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-red-500 text-white hover:bg-red-600"
                              }`}
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-lg text-gray-800">
                              {getQuantidadeEnvio(e.id)}
                            </span>
                            <button
                              onClick={() => incrementarQuantidadeEnvio(e.id)}
                              disabled={getQuantidadeEnvio(e.id) >= quantidadeExibida}
                              className={`w-8 h-8 rounded-full font-bold text-lg transition-colors ${
                                getQuantidadeEnvio(e.id) >= quantidadeExibida
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-green-500 text-white hover:bg-green-600"
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => decrementarPaciente(e.id, getQuantidadeEnvio(e.id))}
                        disabled={quantidadeExibida === 0 || !isPrimeiro || (isPrimeiro && decrementouNesteTurno)}
                        className={`px-4 py-2 rounded-lg font-bold text-lg min-w-[120px] transition-colors ${
                          (quantidadeExibida === 0 || !isPrimeiro || (isPrimeiro && decrementouNesteTurno))
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                            : "bg-orange-600 text-white hover:bg-orange-700"
                        }`}
                        title={
                          !isPrimeiro 
                            ? "Aguarde sua vez" 
                            : decrementouNesteTurno 
                              ? "Você já enviou pacientes neste turno" 
                              : `Enviar ${getQuantidadeEnvio(e.id)} paciente${getQuantidadeEnvio(e.id) > 1 ? 's' : ''}`
                        }
                      >
                        {isPrimeiro && !decrementouNesteTurno ? `🏥 Enviar ${getQuantidadeEnvio(e.id)}` : "⏳ Aguardar"}
                      </button>
                      
                      {isPrimeiro && (
                        <button
                          onClick={() => passarAVez(e.id)}
                          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                          title="Não atende esta especialidade? Caia uma posição na fila e deixe o próximo médico passar"
                        >
                          🔄 Passar a vez
                        </button>
                      )}
                      
                      {/* Botão Exceção - aparece para médicos que estão aguardando (não são o primeiro) e têm pacientes */}
                      {!isPrimeiro && quantidadeExibida > 0 && (
                        <button
                          onClick={() => abrirModalExcecao(e)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                          title="Atender pacientes por exceção - o médico será movido para o final da fila"
                        >
                          ⚡ Exceção ({quantidadeExibida})
                        </button>
                      )}
                      
                      {temMudancas && isPrimeiro && (
                        <button
                          onClick={() => cancelarMudancas(e.id)}
                          className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          ❌ Cancelar
                        </button>
                      )}
                      
                      <button
                        onClick={() => salvarEnvio(e.id)}
                        disabled={(!temMudancas && quantidadeExibida > 0) || !isPrimeiro}
                        className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                          ((!temMudancas && quantidadeExibida > 0) || !isPrimeiro)
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                        title={
                          !isPrimeiro 
                            ? "Aguarde sua vez" 
                            : !temMudancas && quantidadeExibida > 0
                              ? "Nenhuma mudança pendente"
                              : "Confirmar mudanças"
                        }
                      >
                         Salvar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">😴</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhum envio ativo
              </h3>
              <p className="text-gray-500">
                Aguardando solicitações das secretárias...
              </p>
            </div>
          )}
        </div>
        
        {/* Modal de Exceção */}
        {mostrarModalExcecao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    ⚡ Envio por Exceção
                  </h2>
                  <button
                    onClick={fecharModalExcecao}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {medicoSelecionadoExcecao && (
                  <div className="mb-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-purple-800">
                        {medicoSelecionadoExcecao.medico}
                      </h3>
                      <p className="text-sm text-purple-600">
                        Posição na fila: {envios.findIndex(e => e.id === medicoSelecionadoExcecao.id) + 1}°
                      </p>
                      <p className="text-sm text-purple-600">
                        Pacientes atuais: {medicoSelecionadoExcecao.quantidade}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantidade de pacientes a atender por exceção:
                        </label>
                        <p className="text-xs text-purple-600 mb-2">
                          O médico será movido para o final da fila após atender por exceção.
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setDadosExcecao(prev => ({ 
                              ...prev, 
                              quantidade: Math.max(1, prev.quantidade - 1) 
                            }))}
                            className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-lg">
                            {dadosExcecao.quantidade}
                          </span>
                          <button
                            onClick={() => setDadosExcecao(prev => ({ 
                              ...prev, 
                              quantidade: Math.min(medicoSelecionadoExcecao.quantidade, prev.quantidade + 1)
                            }))}
                            disabled={dadosExcecao.quantidade >= medicoSelecionadoExcecao.quantidade}
                            className={`w-8 h-8 rounded-full font-bold ${
                              dadosExcecao.quantidade >= medicoSelecionadoExcecao.quantidade
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Justificativa para exceção: <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={dadosExcecao.justificativa}
                          onChange={(e) => setDadosExcecao(prev => ({ 
                            ...prev, 
                            justificativa: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows="3"
                          placeholder="Explique o motivo do envio por exceção (urgência médica, situação especial, etc.)"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t mt-6">
                      <button
                        onClick={enviarExcecao}
                        disabled={!dadosExcecao.justificativa.trim()}
                        className={`flex-1 py-2 rounded-lg transition-colors font-medium ${
                          dadosExcecao.justificativa.trim()
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        ⚡ Enviar por Exceção
                      </button>
                      <button
                        onClick={fecharModalExcecao}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
