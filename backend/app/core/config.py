from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str

    JWT_SECRET_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.DATABASE_URL

        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)

        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)

        return url


settings = Settings()
