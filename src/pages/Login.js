import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      navigate("/painel-secretaria");
    } catch (error) {
      alert("Erro ao entrar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-4"
        >
          Entrar
        </button>
        
        {/* Botão para ir ao cadastro */}
        <button
          onClick={() => navigate("/cadastro")}
          className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 mb-4"
        >
          Não tem conta? Cadastre-se
        </button>
        
        {/* Link discreto para Admin */}
        <div className="text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Acesso Administrativo
          </button>
        </div>




      </div>
    </div>
  );
}
