// Re-export implementation from the JSX module to avoid having JSX in a `.js` file.
export { useAuth, AuthProvider } from './AuthContext.jsx';
// Also re-export AuthProvider as the default export so imports like
// `import AuthProvider from './AuthContext'` work as expected.
export { AuthProvider as default } from './AuthContext.jsx';