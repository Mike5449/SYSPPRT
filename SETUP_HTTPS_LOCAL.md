# Configuration HTTPS Local pour Scanner QR Code Mobile

## Problème
Les navigateurs mobiles nécessitent HTTPS pour accéder à la caméra (scanner QR code).

## Solution : mkcert (certificat SSL local de confiance)

### 1. Installer mkcert

```powershell
# Dans PowerShell en tant qu'administrateur
winget install FiloSottile.mkcert
```

### 2. Créer les certificats SSL

```powershell
# Initialiser mkcert (une seule fois)
mkcert -install

# Trouver votre adresse IP locale
ipconfig
# Notez votre "Adresse IPv4" (ex: 192.168.1.100)

# Aller dans le dossier frontend
cd c:\Users\DELL\OneDrive\Desktop\full-stack-fastapi-template\frontend

# Créer le certificat (REMPLACEZ 192.168.141.18 par VOTRE IP)
mkcert localhost 127.0.0.1 192.168.141.18 ::1
```

**Résultat :** 2 fichiers créés dans `frontend/`
- `localhost+3.pem` (certificat)
- `localhost+3-key.pem` (clé privée)

### 3. Configuration automatique

✅ **Vite est déjà configuré** dans `vite.config.ts` pour utiliser HTTPS avec ces certificats.

### 4. Mettre à jour .env

Modifiez votre fichier `.env` à la racine du projet :

```bash
# REMPLACEZ par votre IP locale
FRONTEND_HOST=https://192.168.141.18:5173

# Ajoutez https:// dans CORS
BACKEND_CORS_ORIGINS="http://localhost,http://localhost:5173,https://localhost,https://localhost:5173,http://192.168.141.18,http://192.168.141.18:5173,https://192.168.141.18,https://192.168.141.18:5173"

# Frontend - mettre à jour dans frontend/.env aussi
VITE_API_URL=http://192.168.141.18:8000
```

### 5. Installer le certificat sur votre téléphone

**Option A : Automatique (si sur le même réseau)**
1. Sur votre PC, démarrez le frontend : `npm run dev`
2. Sur votre téléphone, ouvrez : `https://192.168.141.18:5173`
3. Le navigateur demandera d'accepter le certificat → Accepter

**Option B : Manuel (plus sûr)**
1. Transférez `localhost+3.pem` sur votre téléphone
2. **Android** : Paramètres → Sécurité → Chiffrement et identifiants → Installer un certificat → Certificat CA
3. **iOS** : 
   - Envoyez-vous le fichier par email
   - Ouvrez-le → Installer le profil
   - Réglages → Général → À propos → Réglages certificat → Activez le certificat

### 6. Démarrer le projet

```powershell
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend (avec HTTPS maintenant)
cd frontend
npm run dev
```

### 7. Accéder depuis le téléphone

Sur votre téléphone (connecté au même WiFi) :
```
https://192.168.141.18:5173
```

✅ La caméra sera maintenant accessible pour scanner les QR codes !

---

## Troubleshooting

### Erreur "Certificate not trusted"
- Assurez-vous d'avoir fait `mkcert -install` sur votre PC
- Installez le certificat manuellement sur votre téléphone (Option B)

### Certificat non trouvé
Vérifiez que les fichiers existent :
```powershell
ls frontend/localhost+3*.pem
```

### Port déjà utilisé
Changez le port dans `vite.config.ts` et mettez à jour votre `.env`

### Le téléphone ne peut pas accéder
- Vérifiez que PC et téléphone sont sur le même WiFi
- Désactivez temporairement le pare-feu Windows
- Vérifiez l'IP avec `ipconfig` (elle peut changer)

---

## Alternative rapide (moins sécurisée)

Si mkcert ne fonctionne pas, vous pouvez utiliser un certificat auto-signé simple :

```powershell
# Dans frontend/
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Puis dans `vite.config.ts` :
```typescript
https: {
  key: fs.readFileSync(path.resolve(__dirname, "key.pem")),
  cert: fs.readFileSync(path.resolve(__dirname, "cert.pem")),
}
```

⚠️ Vous devrez accepter l'avertissement de sécurité sur chaque appareil.
