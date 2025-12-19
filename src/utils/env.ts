export const validateEnvironment = () => {
  const requiredVars = [
    'VITE_GOOGLE_SCRIPT_URL',
    'VITE_GEMINI_API_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars);
    return {
      isValid: false,
      missingVars,
      warnings: missingVars.map(varName => {
        switch (varName) {
          case 'VITE_GOOGLE_SCRIPT_URL':
            return 'Google Sheets integration will not work. Add VITE_GOOGLE_SCRIPT_URL to your .env file.';
          case 'VITE_GEMINI_API_KEY':
            return 'AI features will not work. Add VITE_GEMINI_API_KEY to your .env file.';
          default:
            return `${varName} is required for full functionality.`;
        }
      })
    };
  }

  return { isValid: true, missingVars: [], warnings: [] };
};

export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || defaultValue || '';
};