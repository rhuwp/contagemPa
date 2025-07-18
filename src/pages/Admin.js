// src/pages/Admin.js

import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  Timestamp,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

export default function Admin() {
  console.log("Admin component rendering...");
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ usuario: "", senha: "" });
  const [envios, setEnvios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  
  // Estados para gestão de médicos
  const [mostrarModalMedico, setMostrarModalMedico] = useState(false);
  const [novoMedico, setNovoMedico] = useState({
    nome: '',
    crm: '',
    especialidade: 'Otorrinolaringologista',
    ativo: true,
    naoAtende: []
  });
  
  // Estados para visualização
  const [abaAtiva, setAbaAtiva] = useState('envios'); // envios, medicos, logs, usuarios
  const [gerenciamentoMinimizado, setGerenciamentoMinimizado] = useState(false);

  const handleLogin = () => {
    console.log("Tentativa de login:", loginForm);
    // Credenciais temporárias - em produção usar Firebase Auth
    if (loginForm.usuario === "admin" && loginForm.senha === "admin123") {
      setIsLoggedIn(true);
      console.log("Login aprovado");
      
      // Registrar log de login administrativo
      try {
        addDoc(collection(db, "logs"), {
          tipo: "admin_login",
          acao: "Login administrativo realizado",
          detalhes: "Administrador fez login no painel administrativo",
          usuario: "admin",
          painel: "administrativo", 
          timestamp: Timestamp.now(),
          dados: {
            ip: "local",
            userAgent: navigator.userAgent
          }
        });
        console.log("Log de login admin registrado");
      } catch (error) {
        console.error("Erro ao registrar log de login:", error);
      }
    } else {
      alert("Credenciais inválidas!");
    }
  };

  const handleLogout = () => {
    // Registrar log de logout antes de sair
    try {
      addDoc(collection(db, "logs"), {
        tipo: "admin_logout",
        acao: "Logout administrativo realizado",
        detalhes: "Administrador fez logout do painel administrativo",
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now()
      });
      console.log("Log de logout admin registrado");
    } catch (error) {
      console.error("Erro ao registrar log de logout:", error);
    }
    
    setIsLoggedIn(false);
    setLoginForm({ usuario: "", senha: "" });
  };

  // Função para testar criação de logs
  const testarLog = async () => {
    try {
      await addDoc(collection(db, "logs"), {
        tipo: "teste_sistema",
        acao: "Teste de criação de log",
        detalhes: "Log de teste criado pelo administrador para verificar funcionamento",
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now(),
        dados: {
          teste: true,
          dataHora: new Date().toISOString(),
          navegador: navigator.userAgent
        }
      });
      alert("Log de teste criado com sucesso! Verifique na aba Logs.");
      console.log("Log de teste criado com sucesso");
    } catch (error) {
      console.error("Erro ao criar log de teste:", error);
      alert("Erro ao criar log de teste: " + error.message);
    }
  };

  const carregarEnvios = () => {
    console.log("Carregando envios...");
    try {
      const unsubscribe = onSnapshot(collection(db, "envios"), (snapshot) => {
        const dadosEnvios = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Envios carregados:", dadosEnvios);
        setEnvios(dadosEnvios);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao carregar envios:", error);
    }
  };

  const carregarMedicos = () => {
    try {
      const unsubscribe = onSnapshot(collection(db, "medicos"), (snapshot) => {
        const dadosMedicos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Médicos carregados:", dadosMedicos);
        setMedicos(dadosMedicos);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao carregar médicos:", error);
    }
  };

  const carregarLogs = () => {
    console.log("Iniciando carregamento de logs...");
    try {
      const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(100));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log("Snapshot de logs recebido, docs:", snapshot.docs.length);
        
        if (snapshot.docs.length === 0) {
          console.warn("Nenhum documento encontrado na coleção 'logs'");
        }
        
        const dadosLogs = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Log doc ID:", doc.id, "Data:", data);
          return {
            id: doc.id,
            ...data,
          };
        });
        console.log("Logs processados:", dadosLogs.length, "logs");
        setLogs(dadosLogs);
      }, (error) => {
        console.error("Erro no listener de logs:", error);
        console.error("Detalhes do erro:", error.code, error.message);
        
        // Se der erro de permissão ou ordenação, tentar sem ordenação
        if (error.code === 'failed-precondition' || error.code === 'permission-denied') {
          console.log("Tentando carregamento simples sem ordenação...");
          const unsubscribeSimple = onSnapshot(collection(db, "logs"), (snapshot) => {
            console.log("Snapshot simples de logs recebido, docs:", snapshot.docs.length);
            const dadosLogs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            console.log("Logs simples carregados:", dadosLogs);
            setLogs(dadosLogs);
          });
          return unsubscribeSimple;
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao configurar carregamento de logs:", error);
      // Tentar carregamento simples sem ordenação
      try {
        console.log("Tentando carregamento simples de logs...");
        const unsubscribe = onSnapshot(collection(db, "logs"), (snapshot) => {
          console.log("Snapshot simples de logs recebido, docs:", snapshot.docs.length);
          const dadosLogs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log("Logs simples carregados:", dadosLogs);
          setLogs(dadosLogs);
        });
        return unsubscribe;
      } catch (simpleError) {
        console.error("Erro no carregamento simples de logs:", simpleError);
      }
    }
  };

  const carregarUsuarios = () => {
    try {
      const unsubscribe = onSnapshot(collection(db, "usuarios"), (snapshot) => {
        const dadosUsuarios = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Usuários carregados:", dadosUsuarios);
        setUsuarios(dadosUsuarios);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const alterarStatusEnvio = async (envioId, novoStatus) => {
    try {
      await updateDoc(doc(db, "envios", envioId), {
        status: novoStatus,
        dataAlteracao: Timestamp.now(),
      });
      console.log(`Status do envio ${envioId} alterado para ${novoStatus}`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar status do envio!");
    }
  };

  const excluirEnvio = async (envioId) => {
    if (window.confirm("Tem certeza que deseja excluir este envio?")) {
      try {
        await deleteDoc(doc(db, "envios", envioId));
        console.log(`Envio ${envioId} excluído`);
      } catch (error) {
        console.error("Erro ao excluir envio:", error);
        alert("Erro ao excluir envio!");
      }
    }
  };

  // ===== FUNÇÕES PARA GESTÃO DE MÉDICOS =====
  
  const cadastrarMedico = async () => {
    if (!novoMedico.nome.trim() || !novoMedico.crm.trim()) {
      alert("Nome e CRM são obrigatórios!");
      return;
    }

    try {
      await addDoc(collection(db, "medicos"), {
        ...novoMedico,
        emUso: false,
        secretariaAtual: null,
        criadoEm: Timestamp.now(),
        criadoPor: "admin"
      });

      // Registrar log da ação
      await addDoc(collection(db, "logs"), {
        tipo: "medico_cadastrado",
        acao: "Médico cadastrado",
        detalhes: `Médico ${novoMedico.nome} (CRM: ${novoMedico.crm}) foi cadastrado`,
        usuario: "admin",
        timestamp: Timestamp.now(),
        dados: {
          medicoNome: novoMedico.nome,
          medicoCrm: novoMedico.crm,
          especialidade: novoMedico.especialidade
        }
      });

      setMostrarModalMedico(false);
      setNovoMedico({
        nome: '',
        crm: '',
        especialidade: 'Otorrinolaringologista',
        ativo: true,
        naoAtende: []
      });
      alert("Médico cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar médico:", error);
      alert("Erro ao cadastrar médico!");
    }
  };

  const excluirMedico = async (medicoId, medicoNome) => {
    if (window.confirm(`Tem certeza que deseja excluir o médico ${medicoNome}?`)) {
      try {
        // Verificar se há envios ativos para este médico
        const enviosAtivos = envios.filter(e => e.medicoId === medicoId && e.status === "aberto");
        
        if (enviosAtivos.length > 0) {
          alert("Não é possível excluir este médico pois ele possui envios ativos!");
          return;
        }

        await deleteDoc(doc(db, "medicos", medicoId));

        // Registrar log da ação
        await addDoc(collection(db, "logs"), {
          tipo: "medico_excluido",
          acao: "Médico excluído",
          detalhes: `Médico ${medicoNome} foi excluído do sistema`,
          usuario: "admin",
          timestamp: Timestamp.now(),
          dados: {
            medicoId,
            medicoNome
          }
        });

        console.log(`Médico ${medicoId} excluído`);
        alert("Médico excluído com sucesso!");
      } catch (error) {
        console.error("Erro ao excluir médico:", error);
        alert("Erro ao excluir médico!");
      }
    }
  };

  const toggleStatusMedico = async (medicoId, statusAtual, medicoNome) => {
    try {
      const novoStatus = !statusAtual;
      await updateDoc(doc(db, "medicos", medicoId), {
        ativo: novoStatus,
        alteradoEm: Timestamp.now()
      });

      // Registrar log da ação
      await addDoc(collection(db, "logs"), {
        tipo: "medico_status_alterado",
        acao: `Médico ${novoStatus ? 'ativado' : 'desativado'}`,
        detalhes: `Status do médico ${medicoNome} alterado para ${novoStatus ? 'ativo' : 'inativo'}`,
        usuario: "admin",
        timestamp: Timestamp.now(),
        dados: {
          medicoId,
          medicoNome,
          statusAnterior: statusAtual,
          novoStatus
        }
      });

      console.log(`Status do médico ${medicoId} alterado para ${novoStatus}`);
    } catch (error) {
      console.error("Erro ao alterar status do médico:", error);
      alert("Erro ao alterar status do médico!");
    }
  };

  // Função para gerar relatório Excel com fallback para CSV
  const gerarRelatorioExcel = async () => {
    setLoadingRelatorio(true);
    
    try {
      // Registrar log do início da geração do relatório
      await addDoc(collection(db, "logs"), {
        tipo: "relatorio_excel_iniciado",
        acao: "Geração de relatório Excel iniciada",
        detalhes: "Administrador iniciou a geração de relatório Excel completo",
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now(),
        dados: {
          tipoRelatorio: "excel",
          totalEnvios: envios.length,
          totalMedicos: medicos.length,
          totalLogs: logs.length,
          totalUsuarios: usuarios.length
        }
      });
      console.log("Log de início de relatório Excel registrado");
      // Preparar dados dos envios
      const dadosEnvios = envios.map((envio, index) => ({
        'Nº': index + 1,
        'Médico': envio.medico || 'N/A',
        'Secretária': envio.secretariaNome || 'N/A',
        'Quantidade': envio.quantidade || 0,
        'Status': envio.status === "aberto" ? "Aberto" : "Concluído",
        'Observação': envio.observacao || 'Sem observação',
        'Data Criação': envio.criado_em?.toDate().toLocaleDateString('pt-BR') || 'N/A',
        'Hora Criação': envio.criado_em?.toDate().toLocaleTimeString('pt-BR') || 'N/A',
        'Data Alteração': envio.dataAlteracao?.toDate().toLocaleDateString('pt-BR') || '-',
        'Hora Alteração': envio.dataAlteracao?.toDate().toLocaleTimeString('pt-BR') || '-'
      }));

      // Preparar dados dos médicos
      const dadosMedicos = medicos.map((medico, index) => ({
        'Nº': index + 1,
        'Nome': medico.nome || 'N/A',
        'CRM': medico.crm || 'N/A',
        'Especialidade': medico.especialidade || 'N/A',
        'Status': medico.ativo ? 'Ativo' : 'Inativo',
        'Em Uso': medico.emUso ? 'Sim' : 'Não',
        'Áreas que NÃO atende': medico.naoAtende?.join(', ') || 'Todas as áreas',
        'Secretária Atual': medico.secretariaAtual || 'Nenhuma',
        'Data Cadastro': medico.criadoEm?.toDate().toLocaleDateString('pt-BR') || 'N/A',
        'Último Uso': medico.ultimoUso?.toDate().toLocaleString('pt-BR') || 'Nunca'
      }));

      // Preparar dados dos logs
      const dadosLogs = logs.map((log, index) => ({
        'Nº': index + 1,
        'Data/Hora': log.timestamp?.toDate().toLocaleString('pt-BR') || 'N/A',
        'Tipo': log.tipo?.replace(/_/g, ' ').toUpperCase() || 'N/A',
        'Usuário': log.usuario || 'Sistema',
        'Painel': log.painel === 'secretaria' ? 'Secretaria' : 
                 log.painel === 'pronto_atendimento' ? 'Pronto Atendimento' : 
                 'Administrativo',
        'Descrição': (() => {
          if (typeof log.detalhes === 'string') {
            return log.detalhes;
          }
          
          if (log.detalhes && typeof log.detalhes === 'object') {
            if (log.tipo?.includes('pacientes_enviados')) {
              return `${log.detalhes.medico} - Enviou ${log.detalhes.quantidadeEnviada} paciente(s), restam ${log.detalhes.quantidadeRestante}`;
            } else if (log.tipo?.includes('excecao_enviada')) {
              return `EXCEÇÃO: ${log.detalhes.medico} (${log.detalhes.posicaoAnterior}° → ${log.detalhes.novaPosicao}) atendeu ${log.detalhes.quantidadeAtendida} paciente(s) por exceção. Restam ${log.detalhes.quantidadeRestante}. Justificativa: ${log.detalhes.justificativa}`;
            } else if (log.tipo?.includes('passou_vez')) {
              return `${log.detalhes.medico} passou a vez (posição ${log.detalhes.posicaoAnterior} → ${log.detalhes.novaPosicao})`;
            } else if (log.tipo?.includes('pedido_criado')) {
              const obs = log.detalhes.observacao && log.detalhes.observacao !== 'Sem observação' ? ` - ${log.detalhes.observacao}` : '';
              return `Pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)${obs}`;
            } else if (log.tipo?.includes('pedido_cancelado')) {
              return `Cancelou pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)`;
            } else if (log.tipo?.includes('envio_finalizado')) {
              return `Finalizou atendimento - ${log.detalhes.medico} (${log.detalhes.quantidadeTotalEnviada} pacientes)`;
            } else if (log.tipo?.includes('medico_cadastrado')) {
              return `Cadastrou médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
            } else if (log.tipo?.includes('medico_excluido')) {
              return `Excluiu médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
            } else if (log.tipo?.includes('medico_status_alterado')) {
              const status = log.detalhes.novoStatus || log.dados?.novoStatus ? 'ativou' : 'desativou';
              return `${status} o médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
            }
          }
          
          return log.acao || log.tipo || 'Ação registrada';
        })()
      }));

      // Preparar dados dos usuários
      const dadosUsuarios = usuarios.map((usuario, index) => {
        const enviosDoUsuario = envios.filter(e => e.secretariaId === usuario.id && e.status === "aberto");
        return {
          'Nº': index + 1,
          'Nome': usuario.nome || 'N/A',
          'Email': usuario.email || 'N/A',
          'Tipo': usuario.tipo === 'secretaria' ? 'Secretária' : 
                 usuario.tipo === 'pa' ? 'Pronto Atendimento' : 
                 usuario.tipo || 'Não definido',
          'Última Atividade': usuario.ultimoLogin?.toDate().toLocaleString('pt-BR') || 'Nunca',
          'Envios Ativos': enviosDoUsuario.length,
          'Total Pacientes Ativos': enviosDoUsuario.reduce((sum, e) => sum + (e.quantidade || 0), 0)
        };
      });

      // Estatísticas gerais
      const totalEnvios = envios.length;
      const enviosAbertos = envios.filter(e => e.status === "aberto").length;
      const enviosConcluidos = envios.filter(e => e.status === "concluido").length;
      const totalPacientes = envios.reduce((sum, envio) => sum + (envio.quantidade || 0), 0);
      const medicosAtivos = medicos.filter(m => m.ativo).length;
      const medicosEmUso = medicos.filter(m => m.emUso).length;
      const secretarias = usuarios.filter(u => u.tipo === 'secretaria').length;
      const vezesPassadas = logs.filter(l => l.tipo?.includes('passou_vez')).length;
      const pacientesEnviados = logs.filter(l => l.tipo?.includes('enviado')).length;

      // Tentar carregar XLSX
      try {
        // Primeiro tenta importar XLSX se estiver instalado
        const XLSX = await import('xlsx');
        console.log("XLSX carregado via import");

        // Criar workbook
        const workbook = XLSX.utils.book_new();

        // Aba 1: Envios
        const wsEnvios = XLSX.utils.json_to_sheet(dadosEnvios);
        wsEnvios['!cols'] = [
          { wch: 5 },  // Nº
          { wch: 20 }, // Médico
          { wch: 15 }, // Secretária
          { wch: 12 }, // Quantidade
          { wch: 12 }, // Status
          { wch: 25 }, // Observação
          { wch: 15 }, // Data Criação
          { wch: 15 }, // Hora Criação
          { wch: 15 }, // Data Alteração
          { wch: 15 }  // Hora Alteração
        ];
        XLSX.utils.book_append_sheet(workbook, wsEnvios, "Envios");

        // Aba 2: Médicos
        const wsMedicos = XLSX.utils.json_to_sheet(dadosMedicos);
        wsMedicos['!cols'] = [
          { wch: 5 },  // Nº
          { wch: 25 }, // Nome
          { wch: 15 }, // CRM
          { wch: 20 }, // Especialidade
          { wch: 10 }, // Status
          { wch: 10 }, // Em Uso
          { wch: 20 }, // Áreas que NÃO atende
          { wch: 15 }, // Secretária Atual
          { wch: 15 }, // Data Cadastro
          { wch: 20 }  // Último Uso
        ];
        XLSX.utils.book_append_sheet(workbook, wsMedicos, "Médicos");

        // Aba 3: Logs
        const wsLogs = XLSX.utils.json_to_sheet(dadosLogs);
        wsLogs['!cols'] = [
          { wch: 5 },  // Nº
          { wch: 20 }, // Data/Hora
          { wch: 20 }, // Tipo
          { wch: 15 }, // Usuário
          { wch: 15 }, // Painel
          { wch: 50 }  // Descrição
        ];
        XLSX.utils.book_append_sheet(workbook, wsLogs, "Logs");

        // Aba 4: Usuários
        const wsUsuarios = XLSX.utils.json_to_sheet(dadosUsuarios);
        wsUsuarios['!cols'] = [
          { wch: 5 },  // Nº
          { wch: 20 }, // Nome
          { wch: 25 }, // Email
          { wch: 15 }, // Tipo
          { wch: 20 }, // Última Atividade
          { wch: 12 }, // Envios Ativos
          { wch: 15 }  // Total Pacientes Ativos
        ];
        XLSX.utils.book_append_sheet(workbook, wsUsuarios, "Usuários");

        // Aba 5: Estatísticas
        const dadosEstatisticas = [
          { 'Métrica': 'Total de Envios', 'Valor': totalEnvios },
          { 'Métrica': 'Envios Abertos', 'Valor': enviosAbertos },
          { 'Métrica': 'Envios Concluídos', 'Valor': enviosConcluidos },
          { 'Métrica': 'Total de Pacientes', 'Valor': totalPacientes },
          { 'Métrica': 'Total de Médicos', 'Valor': medicos.length },
          { 'Métrica': 'Médicos Ativos', 'Valor': medicosAtivos },
          { 'Métrica': 'Médicos em Uso', 'Valor': medicosEmUso },
          { 'Métrica': 'Total de Usuários', 'Valor': usuarios.length },
          { 'Métrica': 'Secretárias', 'Valor': secretarias },
          { 'Métrica': 'Total de Logs', 'Valor': logs.length },
          { 'Métrica': 'Vezes Passadas', 'Valor': vezesPassadas },
          { 'Métrica': 'Pacientes Enviados (logs)', 'Valor': pacientesEnviados },
          { 'Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleString('pt-BR') },
          { 'Métrica': 'Gerado por', 'Valor': 'Sistema Administrativo Unimed' }
        ];

        const wsEstatisticas = XLSX.utils.json_to_sheet(dadosEstatisticas);
        wsEstatisticas['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, wsEstatisticas, "Estatísticas");

        // Gerar nome do arquivo com data/hora
        const agora = new Date();
        const nomeArquivo = `relatorio_completo_unimed_${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}.xlsx`;

        // Baixar arquivo
        XLSX.writeFile(workbook, nomeArquivo);
        
        // Registrar log de sucesso
        await addDoc(collection(db, "logs"), {
          tipo: "relatorio_excel_gerado",
          acao: "Relatório Excel gerado com sucesso",
          detalhes: `Relatório Excel completo gerado: ${nomeArquivo}`,
          usuario: "admin",
          painel: "administrativo",
          timestamp: Timestamp.now(),
          dados: {
            nomeArquivo,
            tipoRelatorio: "excel",
            metodo: "xlsx_import",
            totalRegistros: {
              envios: dadosEnvios.length,
              medicos: dadosMedicos.length,
              logs: dadosLogs.length,
              usuarios: dadosUsuarios.length
            }
          }
        });
        
        alert(`Relatório Excel completo gerado com sucesso: ${nomeArquivo}\n\nContém 5 abas:\n- Envios\n- Médicos\n- Logs\n- Usuários\n- Estatísticas`);

      } catch (xlsxError) {
        console.warn("XLSX não disponível, tentando carregar via CDN:", xlsxError);
        
        // Tentar carregar via CDN
        try {
          await carregarXLSXviaScript();
          console.log("XLSX carregado via CDN");

          // Usar window.XLSX (repetir o processo acima)
          const workbook = window.XLSX.utils.book_new();
          
          // Envios
          const wsEnvios = window.XLSX.utils.json_to_sheet(dadosEnvios);
          wsEnvios['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
            { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
          ];
          window.XLSX.utils.book_append_sheet(workbook, wsEnvios, "Envios");

          // Médicos
          const wsMedicos = window.XLSX.utils.json_to_sheet(dadosMedicos);
          wsMedicos['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 },
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
          ];
          window.XLSX.utils.book_append_sheet(workbook, wsMedicos, "Médicos");

          // Logs
          const wsLogs = window.XLSX.utils.json_to_sheet(dadosLogs);
          wsLogs['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 50 }
          ];
          window.XLSX.utils.book_append_sheet(workbook, wsLogs, "Logs");

          // Usuários
          const wsUsuarios = window.XLSX.utils.json_to_sheet(dadosUsuarios);
          wsUsuarios['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 }
          ];
          window.XLSX.utils.book_append_sheet(workbook, wsUsuarios, "Usuários");

          // Estatísticas
          const dadosEstatisticas = [
            { 'Métrica': 'Total de Envios', 'Valor': totalEnvios },
            { 'Métrica': 'Envios Abertos', 'Valor': enviosAbertos },
            { 'Métrica': 'Envios Concluídos', 'Valor': enviosConcluidos },
            { 'Métrica': 'Total de Pacientes', 'Valor': totalPacientes },
            { 'Métrica': 'Total de Médicos', 'Valor': medicos.length },
            { 'Métrica': 'Médicos Ativos', 'Valor': medicosAtivos },
            { 'Métrica': 'Médicos em Uso', 'Valor': medicosEmUso },
            { 'Métrica': 'Total de Usuários', 'Valor': usuarios.length },
            { 'Métrica': 'Secretárias', 'Valor': secretarias },
            { 'Métrica': 'Total de Logs', 'Valor': logs.length },
            { 'Métrica': 'Vezes Passadas', 'Valor': vezesPassadas },
            { 'Métrica': 'Pacientes Enviados (logs)', 'Valor': pacientesEnviados },
            { 'Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleString('pt-BR') },
            { 'Métrica': 'Gerado por', 'Valor': 'Sistema Administrativo Unimed' }
          ];

          const wsEstatisticas = window.XLSX.utils.json_to_sheet(dadosEstatisticas);
          wsEstatisticas['!cols'] = [{ wch: 25 }, { wch: 20 }];
          window.XLSX.utils.book_append_sheet(workbook, wsEstatisticas, "Estatísticas");

          const agora = new Date();
          const nomeArquivo = `relatorio_completo_unimed_${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}.xlsx`;

          window.XLSX.writeFile(workbook, nomeArquivo);
          
          // Registrar log de sucesso via CDN
          await addDoc(collection(db, "logs"), {
            tipo: "relatorio_excel_gerado",
            acao: "Relatório Excel gerado com sucesso (via CDN)",
            detalhes: `Relatório Excel completo gerado via CDN: ${nomeArquivo}`,
            usuario: "admin",
            painel: "administrativo",
            timestamp: Timestamp.now(),
            dados: {
              nomeArquivo,
              tipoRelatorio: "excel",
              metodo: "xlsx_cdn",
              totalRegistros: {
                envios: dadosEnvios.length,
                medicos: dadosMedicos.length,
                logs: dadosLogs.length,
                usuarios: dadosUsuarios.length
              }
            }
          });
          
          alert(`Relatório Excel completo gerado com sucesso (via CDN): ${nomeArquivo}\n\nContém 5 abas:\n- Envios\n- Médicos\n- Logs\n- Usuários\n- Estatísticas`);

        } catch (cdnError) {
          console.warn("CDN também falhou, usando fallback CSV:", cdnError);
          // Registrar log de fallback para CSV
          await addDoc(collection(db, "logs"), {
            tipo: "relatorio_fallback_csv",
            acao: "Fallback para CSV devido a erro no Excel",
            detalhes: "Excel falhou, gerando relatório em formato CSV como alternativa",
            usuario: "admin",
            painel: "administrativo",
            timestamp: Timestamp.now(),
            dados: {
              erroXlsx: xlsxError.message,
              erroCdn: cdnError.message,
              tipoRelatorio: "csv_fallback"
            }
          });
          // Fallback para CSV
          gerarRelatorioCSV();
        }
      }
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      // Registrar log de erro
      try {
        await addDoc(collection(db, "logs"), {
          tipo: "relatorio_excel_erro",
          acao: "Erro na geração de relatório Excel",
          detalhes: `Erro ao gerar relatório Excel: ${error.message}`,
          usuario: "admin",
          painel: "administrativo",
          timestamp: Timestamp.now(),
          dados: {
            erro: error.message,
            tipoRelatorio: "excel",
            stack: error.stack
          }
        });
      } catch (logError) {
        console.error("Erro ao registrar log de erro:", logError);
      }
      alert('Erro ao gerar relatório. Tente o relatório CSV como alternativa.');
    } finally {
      setLoadingRelatorio(false);
    }
  };

  // Função para carregar XLSX via script (CDN)
  const carregarXLSXviaScript = () => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => {
        if (window.XLSX) {
          resolve();
        } else {
          reject(new Error('XLSX não carregou corretamente'));
        }
      };
      script.onerror = () => reject(new Error('Falha ao carregar XLSX do CDN'));
      document.head.appendChild(script);
    });
  };

  // Função alternativa usando CSV (sem dependências)
  const gerarRelatorioCSV = async () => {
    try {
      // Registrar log do início da geração do relatório CSV
      await addDoc(collection(db, "logs"), {
        tipo: "relatorio_csv_iniciado",
        acao: "Geração de relatório CSV iniciada",
        detalhes: "Administrador iniciou a geração de relatório CSV completo",
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now(),
        dados: {
          tipoRelatorio: "csv",
          totalEnvios: envios.length,
          totalMedicos: medicos.length,
          totalLogs: logs.length,
          totalUsuarios: usuarios.length
        }
      });
      console.log("Log de início de relatório CSV registrado");
      
      // Cabeçalho do CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // SEÇÃO 1: ENVIOS
      csvContent += "=== ENVIOS ===\n";
      csvContent += "Número,Médico,Secretária,Quantidade,Status,Observação,Data Criação,Hora Criação,Data Alteração,Hora Alteração\n";

      // Dados dos envios
      envios.forEach((envio, index) => {
        const linha = [
          index + 1,
          envio.medico || 'N/A',
          envio.secretariaNome || 'N/A',
          envio.quantidade || 0,
          envio.status === "aberto" ? "Aberto" : "Concluído",
          envio.observacao || 'Sem observação',
          envio.criado_em ? envio.criado_em.toDate().toLocaleDateString('pt-BR') : 'N/A',
          envio.criado_em ? envio.criado_em.toDate().toLocaleTimeString('pt-BR') : 'N/A',
          envio.dataAlteracao ? envio.dataAlteracao.toDate().toLocaleDateString('pt-BR') : '-',
          envio.dataAlteracao ? envio.dataAlteracao.toDate().toLocaleTimeString('pt-BR') : '-'
        ].map(campo => {
          // Escapar campos que contêm vírgulas
          return typeof campo === 'string' && campo.includes(',') ? `"${campo}"` : campo;
        }).join(',');
        csvContent += linha + "\n";
      });

      // SEÇÃO 2: MÉDICOS
      csvContent += "\n=== MÉDICOS ===\n";
      csvContent += "Número,Nome,CRM,Especialidade,Status,Em Uso,Áreas que NÃO atende,Secretária Atual,Data Cadastro,Último Uso\n";

      medicos.forEach((medico, index) => {
        const linha = [
          index + 1,
          medico.nome || 'N/A',
          medico.crm || 'N/A',
          medico.especialidade || 'N/A',
          medico.ativo ? 'Ativo' : 'Inativo',
          medico.emUso ? 'Sim' : 'Não',
          medico.naoAtende?.join('; ') || 'Todas as áreas',
          medico.secretariaAtual || 'Nenhuma',
          medico.criadoEm ? medico.criadoEm.toDate().toLocaleDateString('pt-BR') : 'N/A',
          medico.ultimoUso ? medico.ultimoUso.toDate().toLocaleString('pt-BR') : 'Nunca'
        ].map(campo => {
          return typeof campo === 'string' && campo.includes(',') ? `"${campo}"` : campo;
        }).join(',');
        csvContent += linha + "\n";
      });

      // SEÇÃO 3: LOGS
      csvContent += "\n=== LOGS ===\n";
      csvContent += "Número,Data/Hora,Tipo,Usuário,Painel,Descrição\n";

      logs.forEach((log, index) => {
        let descricao = '';
        if (typeof log.detalhes === 'string') {
          descricao = log.detalhes;
        } else if (log.detalhes && typeof log.detalhes === 'object') {
          if (log.tipo?.includes('pacientes_enviados')) {
            descricao = `${log.detalhes.medico} - Enviou ${log.detalhes.quantidadeEnviada} paciente(s), restam ${log.detalhes.quantidadeRestante}`;
          } else if (log.tipo?.includes('excecao_enviada')) {
            descricao = `EXCEÇÃO: ${log.detalhes.medico} (${log.detalhes.posicaoAnterior}° → ${log.detalhes.novaPosicao}) atendeu ${log.detalhes.quantidadeAtendida} paciente(s) por exceção. Restam ${log.detalhes.quantidadeRestante}. Justificativa: ${log.detalhes.justificativa}`;
          } else if (log.tipo?.includes('passou_vez')) {
            descricao = `${log.detalhes.medico} passou a vez (posição ${log.detalhes.posicaoAnterior} → ${log.detalhes.novaPosicao})`;
          } else if (log.tipo?.includes('pedido_criado')) {
            const obs = log.detalhes.observacao && log.detalhes.observacao !== 'Sem observação' ? ` - ${log.detalhes.observacao}` : '';
            descricao = `Pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)${obs}`;
          } else if (log.tipo?.includes('pedido_cancelado')) {
            descricao = `Cancelou pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)`;
          } else if (log.tipo?.includes('envio_finalizado')) {
            descricao = `Finalizou atendimento - ${log.detalhes.medico} (${log.detalhes.quantidadeTotalEnviada} pacientes)`;
          } else if (log.tipo?.includes('medico_cadastrado')) {
            descricao = `Cadastrou médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
          } else if (log.tipo?.includes('medico_excluido')) {
            descricao = `Excluiu médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
          } else if (log.tipo?.includes('medico_status_alterado')) {
            const status = log.detalhes.novoStatus || log.dados?.novoStatus ? 'ativou' : 'desativou';
            descricao = `${status} o médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
          }
        } else {
          descricao = log.acao || log.tipo || 'Ação registrada';
        }

        const linha = [
          index + 1,
          log.timestamp ? log.timestamp.toDate().toLocaleString('pt-BR') : 'N/A',
          log.tipo?.replace(/_/g, ' ').toUpperCase() || 'N/A',
          log.usuario || 'Sistema',
          log.painel === 'secretaria' ? 'Secretaria' : 
          log.painel === 'pronto_atendimento' ? 'Pronto Atendimento' : 
          'Administrativo',
          descricao
        ].map(campo => {
          return typeof campo === 'string' && campo.includes(',') ? `"${campo}"` : campo;
        }).join(',');
        csvContent += linha + "\n";
      });

      // SEÇÃO 4: USUÁRIOS
      csvContent += "\n=== USUÁRIOS ===\n";
      csvContent += "Número,Nome,Email,Tipo,Última Atividade,Envios Ativos,Total Pacientes Ativos\n";

      usuarios.forEach((usuario, index) => {
        const enviosDoUsuario = envios.filter(e => e.secretariaId === usuario.id && e.status === "aberto");
        const linha = [
          index + 1,
          usuario.nome || 'N/A',
          usuario.email || 'N/A',
          usuario.tipo === 'secretaria' ? 'Secretária' : 
          usuario.tipo === 'pa' ? 'Pronto Atendimento' : 
          usuario.tipo || 'Não definido',
          usuario.ultimoLogin ? usuario.ultimoLogin.toDate().toLocaleString('pt-BR') : 'Nunca',
          enviosDoUsuario.length,
          enviosDoUsuario.reduce((sum, e) => sum + (e.quantidade || 0), 0)
        ].map(campo => {
          return typeof campo === 'string' && campo.includes(',') ? `"${campo}"` : campo;
        }).join(',');
        csvContent += linha + "\n";
      });

      // SEÇÃO 5: ESTATÍSTICAS
      csvContent += "\n=== ESTATÍSTICAS GERAIS ===\n";
      csvContent += "Métrica,Valor\n";
      csvContent += `Total de Envios,${envios.length}\n`;
      csvContent += `Envios Abertos,${envios.filter(e => e.status === "aberto").length}\n`;
      csvContent += `Envios Concluídos,${envios.filter(e => e.status === "concluido").length}\n`;
      csvContent += `Total de Pacientes,${envios.reduce((sum, envio) => sum + (envio.quantidade || 0), 0)}\n`;
      csvContent += `Total de Médicos,${medicos.length}\n`;
      csvContent += `Médicos Ativos,${medicos.filter(m => m.ativo).length}\n`;
      csvContent += `Médicos em Uso,${medicos.filter(m => m.emUso).length}\n`;
      csvContent += `Total de Usuários,${usuarios.length}\n`;
      csvContent += `Secretárias,${usuarios.filter(u => u.tipo === 'secretaria').length}\n`;
      csvContent += `Total de Logs,${logs.length}\n`;
      csvContent += `Vezes Passadas,${logs.filter(l => l.tipo?.includes('passou_vez')).length}\n`;
      csvContent += `Pacientes Enviados (logs),${logs.filter(l => l.tipo?.includes('enviado')).length}\n`;
      csvContent += `Data do Relatório,${new Date().toLocaleString('pt-BR')}\n`;
      csvContent += `Gerado por,Sistema Administrativo Unimed\n`;

      // Criar e baixar arquivo
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      
      const agora = new Date();
      const nomeArquivo = `relatorio_completo_unimed_${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}_${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}.csv`;
      
      link.setAttribute("download", nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Registrar log de sucesso do CSV
      await addDoc(collection(db, "logs"), {
        tipo: "relatorio_csv_gerado",
        acao: "Relatório CSV gerado com sucesso",
        detalhes: `Relatório CSV completo gerado: ${nomeArquivo}`,
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now(),
        dados: {
          nomeArquivo,
          tipoRelatorio: "csv",
          totalRegistros: {
            envios: envios.length,
            medicos: medicos.length,
            logs: logs.length,
            usuarios: usuarios.length
          }
        }
      });
      
      alert(`Relatório CSV completo gerado com sucesso: ${nomeArquivo}\n\nContém todas as seções:\n- Envios\n- Médicos\n- Logs\n- Usuários\n- Estatísticas`);
    } catch (error) {
      console.error('Erro ao gerar relatório CSV:', error);
      // Registrar log de erro do CSV
      try {
        await addDoc(collection(db, "logs"), {
          tipo: "relatorio_csv_erro",
          acao: "Erro na geração de relatório CSV",
          detalhes: `Erro ao gerar relatório CSV: ${error.message}`,
          usuario: "admin",
          painel: "administrativo",
          timestamp: Timestamp.now(),
          dados: {
            erro: error.message,
            tipoRelatorio: "csv",
            stack: error.stack
          }
        });
      } catch (logError) {
        console.error("Erro ao registrar log de erro CSV:", logError);
      }
      alert('Erro ao gerar relatório CSV.');
    }
  };

  // Função para exportar ranking de médicos
  const exportarRankingMedicos = async () => {
    try {
      const dataFiltro = window.dataFiltroRanking || new Date().toISOString().split('T')[0];
      const dataFiltroObj = new Date(dataFiltro + 'T00:00:00');
      const dataFiltroFim = new Date(dataFiltro + 'T23:59:59');
      
      // Calcular dados do ranking
      const rankingMedicos = {};
      
      // Processar envios (pedidos da secretária)
      envios.forEach(envio => {
        if (envio.medico && envio.quantidade) {
          if (!rankingMedicos[envio.medico]) {
            rankingMedicos[envio.medico] = {
              nome: envio.medico,
              pedidosDia: 0,
              enviadosDia: 0,
              totalPedidos: 0,
              totalEnviados: 0
            };
          }
          
          const dataCriacao = envio.criado_em?.toDate();
          const isDoDia = dataCriacao && dataCriacao >= dataFiltroObj && dataCriacao <= dataFiltroFim;
          
          rankingMedicos[envio.medico].totalPedidos += envio.quantidade;
          if (isDoDia) {
            rankingMedicos[envio.medico].pedidosDia += envio.quantidade;
          }
        }
      });
      
      // Processar logs de envios
      logs.forEach(log => {
        if (log.tipo?.includes('pacientes_enviados') && log.detalhes?.medico && log.detalhes?.quantidadeEnviada) {
          const medico = log.detalhes.medico;
          const quantidade = log.detalhes.quantidadeEnviada;
          
          if (!rankingMedicos[medico]) {
            rankingMedicos[medico] = {
              nome: medico,
              pedidosDia: 0,
              enviadosDia: 0,
              totalPedidos: 0,
              totalEnviados: 0
            };
          }
          
          const dataEnvio = log.timestamp?.toDate();
          const isDoDia = dataEnvio && dataEnvio >= dataFiltroObj && dataEnvio <= dataFiltroFim;
          
          rankingMedicos[medico].totalEnviados += quantidade;
          if (isDoDia) {
            rankingMedicos[medico].enviadosDia += quantidade;
          }
        }
      });
      
      // Converter para array e ordenar
      const rankingArray = Object.values(rankingMedicos)
        .sort((a, b) => b.totalPedidos - a.totalPedidos);
      
      // Preparar dados para Excel
      const dadosRanking = rankingArray.map((medico, index) => {
        const taxaEnvio = medico.totalPedidos > 0 ? 
          ((medico.totalEnviados / medico.totalPedidos) * 100).toFixed(1) : '0.0';
        
        return {
          'Posição': index + 1,
          'Médico': medico.nome,
          'Pedidos no Dia': medico.pedidosDia,
          'Enviados no Dia': medico.enviadosDia,
          'Total Pedidos': medico.totalPedidos,
          'Total Enviados': medico.totalEnviados,
          'Taxa de Envio (%)': taxaEnvio
        };
      });
      
      // Registrar log da exportação
      await addDoc(collection(db, "logs"), {
        tipo: "ranking_medicos_exportado",
        acao: "Ranking de médicos exportado",
        detalhes: `Ranking de médicos exportado para data ${new Date(dataFiltro + 'T12:00:00').toLocaleDateString('pt-BR')}`,
        usuario: "admin",
        painel: "administrativo",
        timestamp: Timestamp.now(),
        dados: {
          dataFiltro,
          totalMedicos: rankingArray.length,
          tipoRelatorio: "ranking_medicos"
        }
      });

      // Tentar usar XLSX
      try {
        const XLSX = await import('xlsx');
        
        const workbook = XLSX.utils.book_new();
        
        // Aba do ranking
        const wsRanking = XLSX.utils.json_to_sheet(dadosRanking);
        wsRanking['!cols'] = [
          { wch: 10 }, // Posição
          { wch: 25 }, // Médico
          { wch: 15 }, // Pedidos no Dia
          { wch: 15 }, // Enviados no Dia
          { wch: 15 }, // Total Pedidos
          { wch: 15 }, // Total Enviados
          { wch: 18 }  // Taxa de Envio
        ];
        XLSX.utils.book_append_sheet(workbook, wsRanking, "Ranking Médicos");
        
        // Aba de resumo
        const resumo = [
          { 'Métrica': 'Data do Filtro', 'Valor': new Date(dataFiltro + 'T12:00:00').toLocaleDateString('pt-BR') },
          { 'Métrica': 'Total de Médicos', 'Valor': rankingArray.length },
          { 'Métrica': 'Total Pedidos no Dia', 'Valor': rankingArray.reduce((sum, m) => sum + m.pedidosDia, 0) },
          { 'Métrica': 'Total Enviados no Dia', 'Valor': rankingArray.reduce((sum, m) => sum + m.enviadosDia, 0) },
          { 'Métrica': 'Total Pedidos (Geral)', 'Valor': rankingArray.reduce((sum, m) => sum + m.totalPedidos, 0) },
          { 'Métrica': 'Total Enviados (Geral)', 'Valor': rankingArray.reduce((sum, m) => sum + m.totalEnviados, 0) },
          { 'Métrica': 'Data de Geração', 'Valor': new Date().toLocaleString('pt-BR') },
          { 'Métrica': 'Gerado por', 'Valor': 'Sistema Administrativo Unimed' }
        ];
        
        const wsResumo = XLSX.utils.json_to_sheet(resumo);
        wsResumo['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");
        
        const nomeArquivo = `ranking_medicos_${dataFiltro.replace(/-/g, '')}_${new Date().toISOString().slice(11, 16).replace(':', '')}.xlsx`;
        XLSX.writeFile(workbook, nomeArquivo);
        
        alert(`Ranking de médicos exportado com sucesso: ${nomeArquivo}\n\nContém:\n- Ranking completo dos médicos\n- Resumo estatístico`);
        
      } catch (xlsxError) {
        // Fallback para CSV
        console.warn("XLSX não disponível, gerando CSV:", xlsxError);
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `=== RANKING DE MÉDICOS - ${new Date(dataFiltro + 'T12:00:00').toLocaleDateString('pt-BR')} ===\n`;
        csvContent += "Posição,Médico,Pedidos no Dia,Enviados no Dia,Total Pedidos,Total Enviados,Taxa de Envio (%)\n";
        
        dadosRanking.forEach(linha => {
          const campos = [
            linha['Posição'],
            linha['Médico'],
            linha['Pedidos no Dia'],
            linha['Enviados no Dia'],
            linha['Total Pedidos'],
            linha['Total Enviados'],
            linha['Taxa de Envio (%)']
          ].map(campo => {
            return typeof campo === 'string' && campo.includes(',') ? `"${campo}"` : campo;
          }).join(',');
          csvContent += campos + "\n";
        });
        
        csvContent += "\n=== RESUMO ===\n";
        csvContent += "Métrica,Valor\n";
        csvContent += `Data do Filtro,${new Date(dataFiltro + 'T12:00:00').toLocaleDateString('pt-BR')}\n`;
        csvContent += `Total de Médicos,${rankingArray.length}\n`;
        csvContent += `Total Pedidos no Dia,${rankingArray.reduce((sum, m) => sum + m.pedidosDia, 0)}\n`;
        csvContent += `Total Enviados no Dia,${rankingArray.reduce((sum, m) => sum + m.enviadosDia, 0)}\n`;
        csvContent += `Data de Geração,${new Date().toLocaleString('pt-BR')}\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ranking_medicos_${dataFiltro.replace(/-/g, '')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`Ranking de médicos exportado como CSV com sucesso!`);
      }
      
    } catch (error) {
      console.error('Erro ao exportar ranking:', error);
      alert('Erro ao exportar ranking de médicos.');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const unsubscribeEnvios = carregarEnvios();
      const unsubscribeMedicos = carregarMedicos();
      const unsubscribeLogs = carregarLogs();
      const unsubscribeUsuarios = carregarUsuarios();
      
      return () => {
        if (unsubscribeEnvios) unsubscribeEnvios();
        if (unsubscribeMedicos) unsubscribeMedicos();
        if (unsubscribeLogs) unsubscribeLogs();
        if (unsubscribeUsuarios) unsubscribeUsuarios();
      };
    }
  }, [isLoggedIn]);

  // Tela de Login
  if (!isLoggedIn) {
    console.log("Renderizando tela de login");
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            🔐 Painel Administrativo
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={loginForm.usuario}
                onChange={(e) => setLoginForm(prev => ({ ...prev, usuario: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o usuário"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={loginForm.senha}
                onChange={(e) => setLoginForm(prev => ({ ...prev, senha: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a senha"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Entrar
            </button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            Acesso restrito a administradores
          </div>
        </div>
      </div>
    );
  }

  // Painel Administrativo
  console.log("Renderizando painel admin");
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Painel Administrativo</h1>
              <p className="text-gray-600">Gerencie o sistema Unimed</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Navegação por Abas */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'envios', label: 'Envios', count: envios.length },
                { id: 'medicos', label: 'Médicos', count: medicos.length },
                { id: 'logs', label: 'Logs', count: logs.length },
                { id: 'usuarios', label: 'Usuários', count: usuarios.length }
              ].map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    abaAtiva === aba.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {aba.label} ({aba.count})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Aba de Envios */}
            {abaAtiva === 'envios' && (
              <>
                {/* Estatísticas do Sistema - Primeira seção */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Estatísticas do Sistema</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {envios.filter(e => e.status === "aberto").length}
                      </div>
                      <div className="text-sm text-blue-800">Envios Ativos</div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {medicos.filter(m => m.ativo).length}
                      </div>
                      <div className="text-sm text-green-800">Médicos Ativos</div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {usuarios.filter(u => u.tipo === 'secretaria').length}
                      </div>
                      <div className="text-sm text-purple-800">Secretárias</div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {envios.reduce((sum, envio) => sum + (envio.quantidade || 0), 0)}
                      </div>
                      <div className="text-sm text-orange-800">Total de Pacientes</div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {medicos.filter(m => m.emUso).length}
                      </div>
                      <div className="text-sm text-yellow-800">Médicos em Uso</div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {envios.filter(e => e.status === "concluido").length}
                      </div>
                      <div className="text-sm text-red-800">Envios Concluídos</div>
                    </div>
                    
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-indigo-600">
                        {logs.filter(l => l.tipo?.includes('passou_vez')).length}
                      </div>
                      <div className="text-sm text-indigo-800">Vezes Passadas</div>
                    </div>
                    
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-teal-600">
                        {logs.filter(l => l.tipo?.includes('enviado')).length}
                      </div>
                      <div className="text-sm text-teal-800">Pacientes Enviados</div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {logs.filter(l => l.tipo?.includes('excecao_enviada')).length}
                      </div>
                      <div className="text-sm text-purple-800">Envios por Exceção</div>
                    </div>
                  </div>
                </div>

                {/* Ranking de Médicos - Segunda seção */}
                <div className="mb-6 bg-gray-50 rounded-lg p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">Ranking de Médicos por Pacientes</h2>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      {/* Filtro de Data */}
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 mb-1">Filtrar por data:</label>
                        <input
                          type="date"
                          value={(() => {
                            if (!window.dataFiltroRanking) {
                              window.dataFiltroRanking = new Date().toISOString().split('T')[0];
                            }
                            return window.dataFiltroRanking;
                          })()}
                          onChange={(e) => {
                            window.dataFiltroRanking = e.target.value;
                            // Forçar re-render
                            setEnvios([...envios]);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Botão de Exportar */}
                      <button
                        onClick={() => exportarRankingMedicos()}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                        title="Exportar ranking como relatório Excel"
                      >
                        Exportar Ranking
                      </button>
                    </div>
                  </div>
                  
                  {(() => {
                    const dataFiltro = window.dataFiltroRanking || new Date().toISOString().split('T')[0];
                    const dataFiltroObj = new Date(dataFiltro + 'T00:00:00');
                    const dataFiltroFim = new Date(dataFiltro + 'T23:59:59');
                    
                    // Calcular dados do dia filtrado e totais
                    const rankingMedicos = {};
                    
                    // Processar envios (pedidos da secretária)
                    envios.forEach(envio => {
                      if (envio.medico && envio.quantidade) {
                        if (!rankingMedicos[envio.medico]) {
                          rankingMedicos[envio.medico] = {
                            nome: envio.medico,
                            pedidosDia: 0,
                            enviadosDia: 0,
                            totalPedidos: 0,
                            totalEnviados: 0
                          };
                        }
                        
                        const dataCriacao = envio.criado_em?.toDate();
                        const isDoDia = dataCriacao && dataCriacao >= dataFiltroObj && dataCriacao <= dataFiltroFim;
                        
                        // Pedidos (sempre conta quando secretária faz o pedido)
                        rankingMedicos[envio.medico].totalPedidos += envio.quantidade;
                        if (isDoDia) {
                          rankingMedicos[envio.medico].pedidosDia += envio.quantidade;
                        }
                      }
                    });
                    
                    // Processar logs de envios (quando PA realmente envia os pacientes)
                    logs.forEach(log => {
                      if (log.tipo?.includes('pacientes_enviados') && log.detalhes?.medico && log.detalhes?.quantidadeEnviada) {
                        const medico = log.detalhes.medico;
                        const quantidade = log.detalhes.quantidadeEnviada;
                        
                        if (!rankingMedicos[medico]) {
                          rankingMedicos[medico] = {
                            nome: medico,
                            pedidosDia: 0,
                            enviadosDia: 0,
                            totalPedidos: 0,
                            totalEnviados: 0
                          };
                        }
                        
                        const dataEnvio = log.timestamp?.toDate();
                        const isDoDia = dataEnvio && dataEnvio >= dataFiltroObj && dataEnvio <= dataFiltroFim;
                        
                        // Enviados (quando PA efetivamente envia)
                        rankingMedicos[medico].totalEnviados += quantidade;
                        if (isDoDia) {
                          rankingMedicos[medico].enviadosDia += quantidade;
                        }
                      }
                    });
                    
                    // Converter para array e ordenar por total de pedidos
                    const rankingArray = Object.values(rankingMedicos)
                      .sort((a, b) => b.totalPedidos - a.totalPedidos)
                      .slice(0, 15); // Top 15
                    
                    if (rankingArray.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p>Nenhum dado encontrado para a data selecionada.</p>
                          <p className="text-sm mt-2">Selecione uma data diferente ou aguarde novos registros.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {/* Informações da Data */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Data filtrada:</strong> {new Date(dataFiltro + 'T12:00:00').toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            <strong>Pedidos:</strong> Solicitações feitas pelas secretárias | <strong>Enviados:</strong> Pacientes efetivamente enviados pelo PA
                          </p>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-2 text-left">Pos.</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Médico</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Pedidos no Dia</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Enviados no Dia</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Total Pedidos</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Total Enviados</th>
                                <th className="border border-gray-300 px-4 py-2 text-center">Taxa Envio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rankingArray.map((medico, index) => {
                                const taxaEnvio = medico.totalPedidos > 0 ? 
                                  ((medico.totalEnviados / medico.totalPedidos) * 100).toFixed(1) : '0.0';
                                
                                return (
                                  <tr key={medico.nome} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-2 text-center font-bold">
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 font-medium">
                                      {medico.nome}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                                        {medico.pedidosDia}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                                        {medico.enviadosDia}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm">
                                        {medico.totalPedidos}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-sm">
                                        {medico.totalEnviados}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                        parseFloat(taxaEnvio) >= 80 ? 'bg-green-100 text-green-800' :
                                        parseFloat(taxaEnvio) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {taxaEnvio}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Resumo */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {rankingArray.reduce((sum, m) => sum + m.pedidosDia, 0)}
                            </div>
                            <div className="text-xs text-blue-800">Pedidos no Dia</div>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-green-600">
                              {rankingArray.reduce((sum, m) => sum + m.enviadosDia, 0)}
                            </div>
                            <div className="text-xs text-green-800">Enviados no Dia</div>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-indigo-600">
                              {rankingArray.reduce((sum, m) => sum + m.totalPedidos, 0)}
                            </div>
                            <div className="text-xs text-indigo-800">Total Pedidos</div>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-emerald-600">
                              {rankingArray.reduce((sum, m) => sum + m.totalEnviados, 0)}
                            </div>
                            <div className="text-xs text-emerald-800">Total Enviados</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Gerenciamento de Envios - Terceira seção (com opção de minimizar) */}
                <div className="bg-white border rounded-lg">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Gerenciamento de Envios ({envios.length})
                    </h2>
                    
                    <div className="flex items-center gap-3">
                      {/* Botões de Relatório */}
                      <button
                        onClick={gerarRelatorioExcel}
                        disabled={loadingRelatorio}
                        className={`px-4 py-2 rounded flex items-center gap-2 text-white ${
                          loadingRelatorio 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                        title="Gerar relatório Excel completo com 5 abas: Envios, Médicos, Logs, Usuários e Estatísticas"
                      >
                        {loadingRelatorio ? 'Gerando...' : 'Relatório Completo (Excel)'}
                      </button>
                      <button
                        onClick={gerarRelatorioCSV}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                        title="Gerar relatório CSV completo com todas as seções: Envios, Médicos, Logs, Usuários e Estatísticas"
                      >
                        Relatório Completo (CSV)
                      </button>
                      
                      {/* Botão de Minimizar/Expandir */}
                      <button
                        onClick={() => setGerenciamentoMinimizado(!gerenciamentoMinimizado)}
                        className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 transition-colors"
                        title={gerenciamentoMinimizado ? "Expandir gerenciamento" : "Minimizar gerenciamento"}
                      >
                        {gerenciamentoMinimizado ? "Expandir" : "Minimizar"}
                      </button>
                    </div>
                  </div>
                  
                  {/* Conteúdo do Gerenciamento - só mostra se não estiver minimizado */}
                  {!gerenciamentoMinimizado && (
                    <div className="p-4">
                      {envios.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-2 text-left">Médico</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Secretária</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Quantidade</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Criado em</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {envios.map((envio) => (
                                <tr key={envio.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-2 font-medium">
                                    {envio.medico}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    {envio.secretariaNome || 'N/A'}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    {envio.quantidade} paciente{envio.quantidade > 1 ? "s" : ""}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      envio.status === "aberto"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}>
                                      {envio.status === "aberto" ? "Aberto" : "Concluído"}
                                    </span>
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                    {envio.criado_em?.toDate().toLocaleString('pt-BR')}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2">
                                    <div className="flex gap-2">
                                      {envio.status === "aberto" && (
                                        <button
                                          onClick={() => alterarStatusEnvio(envio.id, "concluido")}
                                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                                        >
                                          Finalizar
                                        </button>
                                      )}
                                      {envio.status === "concluido" && (
                                        <button
                                          onClick={() => alterarStatusEnvio(envio.id, "aberto")}
                                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                                        >
                                          Reabrir
                                        </button>
                                      )}
                                      <button
                                        onClick={() => excluirEnvio(envio.id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">Nenhum envio encontrado.</p>
                      )}
                    </div>
                  )}
                  
                  {/* Indicador quando minimizado */}
                  {gerenciamentoMinimizado && (
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">Seção minimizada - {envios.length} envio{envios.length !== 1 ? 's' : ''} disponível{envios.length !== 1 ? 'is' : ''}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Aba de Médicos */}
            {abaAtiva === 'medicos' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Gerenciamento de Médicos ({medicos.length})
                  </h2>
                  <button
                    onClick={() => setMostrarModalMedico(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    Cadastrar Médico
                  </button>
                </div>
                
                {medicos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Nome</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">CRM</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Especialidade</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Em Uso</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicos.map((medico) => (
                          <tr key={medico.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">
                              {medico.nome}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {medico.crm}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {medico.especialidade}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                medico.ativo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}>
                                {medico.ativo ? "🟢 Ativo" : "🔴 Inativo"}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                medico.emUso
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {medico.emUso ? "Em Uso" : "Disponível"}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleStatusMedico(medico.id, medico.ativo, medico.nome)}
                                  className={`px-3 py-1 rounded text-xs ${
                                    medico.ativo
                                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                      : "bg-green-500 text-white hover:bg-green-600"
                                  }`}
                                >
                                  {medico.ativo ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  onClick={() => excluirMedico(medico.id, medico.nome)}
                                  className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                                  disabled={medico.emUso}
                                  title={medico.emUso ? "Médico em uso, não pode ser excluído" : "Excluir médico"}
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum médico encontrado.</p>
                )}
              </>
            )}

            {/* Aba de Logs */}
            {abaAtiva === 'logs' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Logs do Sistema (Últimos 100)
                  </h2>
                  <button
                    onClick={testarLog}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
                  >
                    Criar Log de Teste
                  </button>
                </div>
                
                {logs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Data/Hora</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Usuário</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              {log.timestamp?.toDate().toLocaleString('pt-BR')}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                log.tipo?.includes('enviado') || log.tipo?.includes('pacientes_enviados') ? 'bg-blue-100 text-blue-800' :
                                log.tipo?.includes('excecao_enviada') ? 'bg-purple-100 text-purple-800' :
                                log.tipo?.includes('cancelado') ? 'bg-red-100 text-red-800' :
                                log.tipo?.includes('passou_vez') ? 'bg-yellow-100 text-yellow-800' :
                                log.tipo?.includes('medico') || log.tipo?.includes('pedido_criado') ? 'bg-green-100 text-green-800' :
                                log.tipo?.includes('finalizado') ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.tipo?.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-medium">
                              {log.usuario || 'Sistema'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              {(() => {
                                if (typeof log.detalhes === 'string') {
                                  return log.detalhes;
                                }
                                
                                if (log.detalhes && typeof log.detalhes === 'object') {
                                  // Formatação específica e mais limpa para diferentes tipos de log
                                  if (log.tipo?.includes('pacientes_enviados')) {
                                    return `${log.detalhes.medico} - Enviou ${log.detalhes.quantidadeEnviada} paciente(s), restam ${log.detalhes.quantidadeRestante}`;
                                  } else if (log.tipo?.includes('excecao_enviada')) {
                                    return `EXCEÇÃO: ${log.detalhes.medico} (${log.detalhes.posicaoAnterior}° → ${log.detalhes.novaPosicao}°) atendeu ${log.detalhes.quantidadeAtendida} paciente(s) por exceção. Restam ${log.detalhes.quantidadeRestante}. Justificativa: ${log.detalhes.justificativa}`;
                                  } else if (log.tipo?.includes('passou_vez')) {
                                    return `${log.detalhes.medico} passou a vez (posição ${log.detalhes.posicaoAnterior} → ${log.detalhes.novaPosicao})`;
                                  } else if (log.tipo?.includes('pedido_criado')) {
                                    const obs = log.detalhes.observacao && log.detalhes.observacao !== 'Sem observação' ? ` - ${log.detalhes.observacao}` : '';
                                    return `Pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)${obs}`;
                                  } else if (log.tipo?.includes('pedido_cancelado')) {
                                    return `Cancelou pedido para ${log.detalhes.medico} - ${log.detalhes.quantidade} paciente(s)`;
                                  } else if (log.tipo?.includes('envio_finalizado')) {
                                    return `Finalizou atendimento - ${log.detalhes.medico} (${log.detalhes.quantidadeTotalEnviada} pacientes)`;
                                  } else if (log.tipo?.includes('medico_cadastrado')) {
                                    return `Cadastrou médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
                                  } else if (log.tipo?.includes('medico_excluido')) {
                                    return `Excluiu médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
                                  } else if (log.tipo?.includes('medico_status_alterado')) {
                                    const status = log.detalhes.novoStatus || log.dados?.novoStatus ? 'ativou' : 'desativou';
                                    return `${status} o médico: ${log.detalhes.medicoNome || log.dados?.medicoNome}`;
                                  }
                                }
                                
                                return log.acao || log.tipo || 'Ação registrada';
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum log encontrado.</p>
                )}
              </>
            )}

            {/* Aba de Usuários */}
            {abaAtiva === 'usuarios' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Usuários do Sistema ({usuarios.length})
                  </h2>
                </div>
                
                {usuarios.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Nome</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Última Atividade</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Envios Ativos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((usuario) => {
                          const enviosDoUsuario = envios.filter(e => e.secretariaId === usuario.id && e.status === "aberto");
                          return (
                            <tr key={usuario.id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {usuario.nome}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {usuario.email}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  usuario.tipo === 'secretaria' ? 'bg-blue-100 text-blue-800' :
                                  usuario.tipo === 'pa' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {usuario.tipo === 'secretaria' ? 'Secretária' : 
                                   usuario.tipo === 'pa' ? 'Pronto Atendimento' : 
                                   usuario.tipo || 'Não definido'}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                {usuario.ultimoLogin?.toDate().toLocaleString('pt-BR') || 'Nunca'}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  enviosDoUsuario.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {enviosDoUsuario.length} envio{enviosDoUsuario.length !== 1 ? 's' : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum usuário encontrado.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal de Cadastro de Médico */}
        {mostrarModalMedico && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Cadastrar Novo Médico
                  </h2>
                  <button
                    onClick={() => setMostrarModalMedico(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo:
                    </label>
                    <input
                      type="text"
                      value={novoMedico.nome}
                      onChange={(e) => setNovoMedico(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Dr. João Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CRM:
                    </label>
                    <input
                      type="text"
                      value={novoMedico.crm}
                      onChange={(e) => setNovoMedico(prev => ({ ...prev, crm: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 12345-SP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especialidade:
                    </label>
                    <select
                      value={novoMedico.especialidade}
                      onChange={(e) => setNovoMedico(prev => ({ ...prev, especialidade: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Otorrinolaringologista">Otorrinolaringologista</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚫 Áreas que NÃO atende:
                    </label>
                    <div className="space-y-2">
                      {['Ouvido', 'Nariz', 'Garganta'].map(area => (
                        <label key={area} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={novoMedico.naoAtende.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNovoMedico(prev => ({
                                  ...prev,
                                  naoAtende: [...prev.naoAtende, area]
                                }));
                              } else {
                                setNovoMedico(prev => ({
                                  ...prev,
                                  naoAtende: prev.naoAtende.filter(a => a !== area)
                                }));
                              }
                            }}
                            className="mr-2 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className={`text-sm ${
                            novoMedico.naoAtende.includes(area) 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-700'
                          }`}>
                            <span className={`inline-block w-4 h-4 border-2 rounded text-center text-xs leading-none mr-2 ${
                              novoMedico.naoAtende.includes(area) 
                                ? 'bg-red-500 border-red-500 text-white' 
                                : 'bg-green-500 border-green-500 text-white'
                            }`}>
                              {novoMedico.naoAtende.includes(area) ? '✗' : '✓'}
                            </span>
                            {area}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={novoMedico.ativo}
                      onChange={(e) => setNovoMedico(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="ativo" className="text-sm text-gray-700">
                      Médico ativo (disponível para receber pedidos)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t mt-6">
                  <button
                    onClick={cadastrarMedico}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Cadastrar Médico
                  </button>
                  <button
                    onClick={() => setMostrarModalMedico(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
