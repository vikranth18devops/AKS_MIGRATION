from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, SecurityScopes
from jose import JWTError, jwt
from pydantic import BaseModel
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

class TokenPayload(BaseModel):
    sub: str
    email: str
    roles: List[str] = []
    exp: Optional[int] = None

def create_access_token(subject: str, email: str, roles: List[str], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {
        "sub": subject,
        "email": email,
        "roles": roles,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

async def get_current_user(
    security_scopes: SecurityScopes,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> TokenPayload:
    # If no bearer token is supplied in development environment, allow a default DevOps Engineer identity for seamless local testing
    if credentials is None:
        if settings.ENVIRONMENT == "development":
            return TokenPayload(
                sub="devops-dev-user-001",
                email="devops@company.com",
                roles=["PLATFORM_ADMIN", "DEVOPS_ENGINEER", "DEVELOPER", "DEVOPS_LEAD", "AUDITOR"]
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(
            sub=payload.get("sub"),
            email=payload.get("email"),
            roles=payload.get("roles", [])
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check RBAC scopes if specified
    if security_scopes.scopes:
        has_required_role = any(scope in token_data.roles for scope in security_scopes.scopes)
        if not has_required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required one of: {security_scopes.scopes}",
            )

    return token_data
