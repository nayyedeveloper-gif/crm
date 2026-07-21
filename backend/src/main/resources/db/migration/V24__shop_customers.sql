-- Shop customer accounts (Google Sign-In)
CREATE TABLE IF NOT EXISTS shop_customers (
    id              BIGSERIAL PRIMARY KEY,
    google_sub      VARCHAR(128) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    full_name       VARCHAR(200),
    phone           VARCHAR(40),
    birthday        DATE,
    address         TEXT,
    avatar_url      VARCHAR(500),
    profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_customers_google_sub UNIQUE (google_sub),
    CONSTRAINT uq_shop_customers_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_shop_customers_email ON shop_customers (email);
