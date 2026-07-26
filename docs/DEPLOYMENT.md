# Static Deployment to Namecheap

This project currently deploys the non-persistent browser prototype by uploading the built `public/` folder to a Namecheap-hosted subdomain.

For the Render/PostgreSQL migration, see [Render + PostgreSQL Migration](RENDER_POSTGRES_MIGRATION.md).

## GitHub Actions Flow

- Push to `main`.
- GitHub Actions runs:
  - `npm ci`
  - `npm run build:css`
  - `node --check server.js`
  - `node --check public/app.js`
- If all checks pass, GitHub Actions uploads `public/` to Namecheap.
- Pull requests run checks only and do not deploy.

## Required GitHub Secrets

Add these in GitHub:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

| Secret | Meaning |
| --- | --- |
| `NAMECHEAP_FTP_SERVER` | FTP/FTPS hostname from Namecheap or cPanel. |
| `NAMECHEAP_FTP_USERNAME` | FTP account username. |
| `NAMECHEAP_FTP_PASSWORD` | FTP account password. |
| `NAMECHEAP_FTP_SERVER_DIR` | Remote subdomain document-root folder. Must end with `/`. |

Example remote folder values:

```text
public_html/
public_html/pms/
public_html/subdomain-folder/
```

Use the exact folder configured as the document root of the hosted subdomain.

## What Gets Deployed

Only this folder is uploaded:

```text
public/
```

That includes:

- `index.html`
- `styles.css`
- `tailwind.css`
- `app.js`

The Node server and SQLite persistence are not part of this static deployment.

## Notes

- Do not commit FTP credentials.
- If the secrets are missing, the workflow still runs CI checks but skips deployment.
- This deployment is suitable only for the current non-persistent prototype.
- Once SQLite and server-side authentication are added, deployment must move to a Node-capable hosting setup.
