# Local cleanup candidates

The ignored `.env.local`, diagnostic logs, `node_modules/`, and `dist/` were deliberately not deleted.
Review environment files before sharing source archives; never include credentials. Dependencies and
build output can be regenerated with `npm ci` and `npm run build`.
