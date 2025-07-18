// scripts/verificarEnv.js
// Script para verificar se todas as variáveis de ambiente estão configuradas

const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

console.log('🔍 Verificando variáveis de ambiente...\n');

let allVarsPresent = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NÃO ENCONTRADA`);
    allVarsPresent = false;
  }
});

console.log('\n📋 Resumo:');
if (allVarsPresent) {
  console.log('✅ Todas as variáveis de ambiente estão configuradas!');
  console.log('🚀 Projeto pronto para deploy');
} else {
  console.log('❌ Algumas variáveis estão faltando');
  console.log('📝 Verifique o arquivo .env e o README');
  process.exit(1);
}

console.log(`\n🌍 Ambiente: ${process.env.REACT_APP_ENVIRONMENT || 'development'}`);
console.log(`🏗️ Node ENV: ${process.env.NODE_ENV || 'development'}`);
