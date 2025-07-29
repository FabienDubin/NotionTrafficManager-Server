// Vérification des variables d'environnement critiques
const requiredEnvVars = [
  'TOKEN_SECRET',
  'MONGODB_URI',
  'PORT'
];

const optionalEnvVars = [
  'ADMINS',
  'MAILJET_API_KEY',
  'MAILJET_SECRET_KEY',
  'NOTION_API_KEY'
];

function checkEnvironmentVariables() {
  console.log('🔍 Vérification des variables d\'environnement...');
  
  let hasErrors = false;
  
  // Vérification des variables requises
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`❌ Variable d'environnement manquante: ${varName}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: configuré`);
    }
  });
  
  // Vérification des variables optionnelles avec avertissements
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.warn(`⚠️  Variable d'environnement optionnelle manquante: ${varName}`);
    } else {
      console.log(`✅ ${varName}: configuré`);
    }
  });
  
  // Vérification spécifique de MONGODB_URI
  if (process.env.MONGODB_URI) {
    if (process.env.MONGODB_URI.includes('127.0.0.1') || process.env.MONGODB_URI.includes('localhost')) {
      console.warn('⚠️  MongoDB configuré en local - vérifiez que MongoDB est démarré');
    } else {
      console.log('✅ MongoDB configuré pour environnement distant');
    }
  }
  
  // Vérification du format des ADMINS
  if (process.env.ADMINS) {
    try {
      const admins = process.env.ADMINS.split(',').map(email => email.trim());
      console.log(`✅ ${admins.length} admin(s) configuré(s):`, admins);
    } catch (error) {
      console.error('❌ Format invalide pour ADMINS:', error.message);
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    console.error('❌ Des variables d\'environnement critiques sont manquantes!');
    process.exit(1);
  } else {
    console.log('✅ Toutes les variables d\'environnement critiques sont configurées');
  }
}

module.exports = { checkEnvironmentVariables };