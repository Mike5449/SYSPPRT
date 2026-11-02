@echo off
REM Script pour activer le bon environnement virtuel et lancer Alembic
echo === Script Alembic pour le bon environnement ===

cd /d "C:\Users\DELL\OneDrive\Desktop\full-stack-fastapi-template\backend"

REM Vérifier si l'environnement virtuel existe
if not exist ".venv\Scripts\activate.bat" (
    echo ❌ Environnement virtuel non trouvé dans .venv
    echo Création de l'environnement virtuel...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    echo ✅ Activation de l'environnement virtuel local...
    call .venv\Scripts\activate.bat
)

echo.
echo 📍 Répertoire courant: %CD%
echo 🐍 Python utilisé:
where python
echo.

echo === Test des imports ===
python -c "import app.models; print('✅ app.models OK'); from app.models import User; print('✅ User OK')"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo === Génération de la migration ===
    alembic revision --autogenerate -m "Create all tables"
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo === Application de la migration ===
        alembic upgrade head
    )
) else (
    echo ❌ Problème avec les imports, veuillez vérifier la configuration
)

echo.
echo === Fin du script ===
pause