#!/usr/bin/env node
// Generates a bcrypt hash for AUTH_PASSWORD_HASH (see README "Variables de
// entorno"). The plaintext password itself is never stored anywhere.
//
// Usage: node scripts/hash-password.mjs "la-contraseña-del-consultorio"

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "<contraseña>"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAUTH_PASSWORD_HASH=' + hash + '\n');
console.log('Copiá esa línea completa a tus variables de entorno (.env o el panel del hosting).');
