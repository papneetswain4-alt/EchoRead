from pydantic import BaseModel
from typing import Dict

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    details: Dict[str, str] = {}
