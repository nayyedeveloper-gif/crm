-- Grand Opening invitation popup (storefront)

ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS invite_popup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS invite_popup_title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS invite_popup_date VARCHAR(120),
    ADD COLUMN IF NOT EXISTS invite_popup_special TEXT,
    ADD COLUMN IF NOT EXISTS invite_popup_image VARCHAR(500);

UPDATE app_settings
SET invite_popup_enabled = COALESCE(invite_popup_enabled, TRUE),
    invite_popup_title = COALESCE(invite_popup_title, 'Grand Opening'),
    invite_popup_date = COALESCE(invite_popup_date, 'Opening Soon'),
    invite_popup_special = COALESCE(
        invite_popup_special,
        'Exclusive jewellery offers for our Grand Opening — limited pieces available.'
    )
WHERE id = 1;
