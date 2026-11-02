# Script PowerShell pour Alembic avec le bon environnement
Write-Host "=== Script Alembic PowerShell ===" -ForegroundColor Green

# Aller dans le bon répertoire
$projectPath = "C:\Users\DELL\OneDrive\Desktop\full-stack-fastapi-template\backend"
Set-Location $projectPath
Write-Host "📍 Répertoire: $PWD" -ForegroundColor Blue

# Vérifier et activer l'environnement virtuel
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "✅ Activation de l'environnement virtuel local..." -ForegroundColor Green
    & ".\.venv\Scripts\Activate.ps1"
} else {
    Write-Host "❌ Environnement virtuel non trouvé" -ForegroundColor Red
    Write-Host "Création de l'environnement virtuel..." -ForegroundColor Yellow
    python -m venv .venv
    & ".\.venv\Scripts\Activate.ps1"
    pip install -e .
}

# Vérifier Python utilisé
Write-Host "🐍 Python utilisé:" -ForegroundColor Blue
Get-Command python | Select-Object -ExpandProperty Source

# Test des imports
Write-Host "`n=== Test des imports ===" -ForegroundColor Green
try {
    python -c "import app.models; print('✅ app.models OK'); from app.models import User; print('✅ User OK')"
    $importOK = $true
} catch {
    Write-Host "❌ Problème avec les imports" -ForegroundColor Red
    $importOK = $false
}

if ($importOK) {
    Write-Host "`n=== Génération de la migration ===" -ForegroundColor Green
    alembic revision --autogenerate -m "Create all tables"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=== Application de la migration ===" -ForegroundColor Green
        alembic upgrade head
    }
} else {
    Write-Host "❌ Impossible de continuer sans imports fonctionnels" -ForegroundColor Red
}

Write-Host "`n=== Fin du script ===" -ForegroundColor Green