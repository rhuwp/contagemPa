import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Cadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const navigate = useNavigate();

  const cadastrar = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      
      const dadosUsuario = {
        nome,
        tipo: "secretaria",
        // Médico será configurado posteriormente no painel
        medico: null,
        especialidade: null,
        areasAtendidas: null,
        naoAtende: null,
        observacao: null,
      };

      await setDoc(doc(db, "usuarios", cred.user.uid), dadosUsuario);
      
      alert("Cadastro realizado com sucesso! Configure o médico no painel da secretaria.");
      navigate("/painel-secretaria");
    } catch (error) {
      alert("Erro no cadastro: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-green-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
          🩺 Cadastro de Secretária
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Sistema Unimed - Especialidade: Otorrinolaringologia
        </p>

        {/* Informações da Secretária */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Suas Informações</h3>
          
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Seu nome e sobrenome"
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        {/* Informativo sobre configuração do médico */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            ℹ️ Próximo Passo
          </h3>
          <p className="text-blue-700 text-sm">
            Após criar sua conta, você configurará as informações do médico diretamente no painel da secretaria.
          </p>
        </div>

        <button
          onClick={cadastrar}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
        >
          🚀 Criar Conta 
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            Já tem conta? Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}
