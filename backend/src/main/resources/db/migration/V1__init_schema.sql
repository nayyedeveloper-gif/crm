-- =====================================================================
-- Sale CRM - initial schema
-- Multi-branch, concurrency-safe (version columns), auditing built in.
-- =====================================================================

CREATE TABLE branches (
    id          BIGSERIAL PRIMARY KEY,
    version     BIGINT       NOT NULL DEFAULT 0,
    code        VARCHAR(40)  NOT NULL,
    name        VARCHAR(160) NOT NULL,
    phone       VARCHAR(40),
    address     VARCHAR(400),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by  VARCHAR(120),
    updated_by  VARCHAR(120),
    CONSTRAINT uk_branch_code UNIQUE (code)
);

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    version        BIGINT       NOT NULL DEFAULT 0,
    username       VARCHAR(80)  NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    full_name      VARCHAR(160) NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    branch_id      BIGINT,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by     VARCHAR(120),
    updated_by     VARCHAR(120),
    CONSTRAINT uk_user_username UNIQUE (username),
    CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
);

CREATE TABLE regions (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL,
    name_mm     VARCHAR(120) NOT NULL,
    name_en     VARCHAR(120),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT uk_region_code UNIQUE (code)
);

CREATE TABLE townships (
    id          BIGSERIAL PRIMARY KEY,
    region_id   BIGINT       NOT NULL,
    name_mm     VARCHAR(120) NOT NULL,
    name_en     VARCHAR(120),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT fk_township_region FOREIGN KEY (region_id) REFERENCES regions (id)
);
CREATE INDEX idx_township_region ON townships (region_id);

CREATE TABLE crm_history (
    id            BIGSERIAL PRIMARY KEY,
    version       BIGINT         NOT NULL DEFAULT 0,
    branch_id     BIGINT         NOT NULL,
    customer_name VARCHAR(160)   NOT NULL,
    phone         VARCHAR(40)    NOT NULL,
    birthday      DATE,
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
    action_type   VARCHAR(20)    NOT NULL DEFAULT 'PURCHASE',
    region_id     BIGINT,
    township_id   BIGINT,
    address       VARCHAR(400),
    remark        VARCHAR(1000),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by    VARCHAR(120),
    updated_by    VARCHAR(120),
    CONSTRAINT fk_crm_branch    FOREIGN KEY (branch_id)   REFERENCES branches (id),
    CONSTRAINT fk_crm_region    FOREIGN KEY (region_id)   REFERENCES regions (id),
    CONSTRAINT fk_crm_township  FOREIGN KEY (township_id) REFERENCES townships (id)
);

CREATE INDEX idx_crm_branch         ON crm_history (branch_id);
CREATE INDEX idx_crm_phone          ON crm_history (phone);
CREATE INDEX idx_crm_customer_name  ON crm_history (customer_name);
CREATE INDEX idx_crm_created_at     ON crm_history (created_at);
CREATE INDEX idx_crm_branch_created ON crm_history (branch_id, created_at);
