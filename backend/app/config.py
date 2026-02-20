from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    api_key: str
    app_name: str = "Learning Tracker API"
    app_env: str = "development"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalise_database_url(cls, value: str) -> str:
        normalized = value.strip().strip('"').strip("'")
        if normalized.startswith("postgres://"):
            normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
        elif normalized.startswith("postgresql://"):
            normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)

        parsed = urlsplit(normalized)
        query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))

        # asyncpg uses ssl= not sslmode=
        if "sslmode" in query_params:
            query_params["ssl"] = query_params.pop("sslmode")

        # libpq-specific option that asyncpg does not support.
        query_params.pop("channel_binding", None)

        # Only force SSL for remote (non-localhost) hosts.
        host = parsed.hostname or ""
        is_local = host in ("localhost", "127.0.0.1", "::1", "")
        if not is_local and "ssl" not in query_params:
            query_params["ssl"] = "require"

        rebuilt = urlunsplit(
            (parsed.scheme, parsed.netloc, parsed.path, urlencode(query_params), parsed.fragment)
        )
        return rebuilt


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
