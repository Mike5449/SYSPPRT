import random
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import Session, select

from app.models.user_otp import UserOTP

class OTPService:
    def __init__(self, session: Session):
        self.session = session

    def generate_otp(self, user_id: uuid.UUID) -> str:
        """
        Génère un OTP de 6 chiffres, l'enregistre en base et l'expire dans 60 secondes.
        """
        code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=60)
        
        # Inactiver les anciens OTP non utilisés pour cet utilisateur
        statement = select(UserOTP).where(
            UserOTP.user_id == user_id, 
            UserOTP.is_used == False,
            UserOTP.expires_at > datetime.now(timezone.utc)
        )
        old_otps = self.session.exec(statement).all()
        for old_otp in old_otps:
            old_otp.is_used = True
            self.session.add(old_otp)

        db_otp = UserOTP(
            user_id=user_id,
            code=code,
            expires_at=expires_at
        )
        self.session.add(db_otp)
        self.session.commit()
        return code

    def verify_otp(self, user_id: uuid.UUID, code: str) -> bool:
        """
        Vérifie si l'OTP est valide, non expiré et non utilisé.
        """
        statement = select(UserOTP).where(
            UserOTP.user_id == user_id,
            UserOTP.code == code,
            UserOTP.is_used == False,
            UserOTP.expires_at > datetime.now(timezone.utc)
        )
        db_otp = self.session.exec(statement).first()
        
        if db_otp:
            db_otp.is_used = True
            self.session.add(db_otp)
            self.session.commit()
            return True
        
        return False
