-- Editable legal pages + shop contact details
ALTER TABLE app_settings
    ADD COLUMN IF NOT EXISTS user_agreement TEXT,
    ADD COLUMN IF NOT EXISTS privacy_policy TEXT,
    ADD COLUMN IF NOT EXISTS shop_contact_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS shop_contact_email VARCHAR(120),
    ADD COLUMN IF NOT EXISTS shop_contact_address TEXT,
    ADD COLUMN IF NOT EXISTS shop_contact_hours VARCHAR(200);

UPDATE app_settings
SET user_agreement = COALESCE(user_agreement, $ua$
1. Acceptance
By signing in, you confirm that you are an authorized user and that you accept this User Agreement together with the Privacy Policy.

2. Authorized use
You may use the System only for legitimate business activities related to CRM history, performance, reporting, products, and settings granted to your role. Unauthorized access, data scraping, or misuse of customer information is prohibited.

3. Accounts and credentials
You are responsible for all activity under your account. Do not share passwords. Notify an administrator immediately if you suspect unauthorized use.

4. Data accuracy and integrity
You agree to enter accurate CRM and product information, respect branch boundaries, and avoid altering or deleting records except as permitted by your role and company process.

5. Product QR and public pages
Product QR codes may open public product detail pages without login. You must ensure published product content is appropriate for public viewing.

6. Monitoring and logs
The System may record change logs and system logs for security, auditing, and support. Administrators may review these logs when investigating issues or misuse.

7. Suspension
Access may be suspended or revoked if this Agreement is violated, or when employment / branch assignment ends.

8. Changes
We may update this Agreement from time to time. Continued use after updates constitutes acceptance of the revised terms.
$ua$),
    privacy_policy = COALESCE(privacy_policy, $pp$
1. Introduction
This Privacy Policy explains how we collect, use, and protect information in connection with this System.

2. Information we collect
We may collect account details (name, username, role, branch), CRM and product records you enter, and technical logs (login time, IP, device/browser metadata) needed for security and support.

3. How we use information
Information is used to operate the CRM and shop, provide support, improve reliability and security, and meet internal audit requirements.

4. Sharing
We do not sell personal data. Information may be shared with authorized administrators, hosting providers under contract, or when required by law.

5. Retention
Records are retained while your account is active and as required by company policy or law. Logs may be kept for a limited period for security review.

6. Security
We use access controls, authentication, and operational practices to protect data. No method of transmission or storage is 100% secure.

7. Your responsibilities
Keep credentials confidential and use the System only as authorized. Report suspected breaches promptly.

8. Contact
For privacy questions, contact your system administrator or the shop contact details published in Settings.
$pp$)
WHERE id = 1;
