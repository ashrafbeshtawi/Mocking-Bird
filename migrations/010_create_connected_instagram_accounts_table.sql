CREATE TABLE connected_instagram_accounts (
    id SERIAL PRIMARY KEY,
    instagram_account_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    facebook_page_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facebook_page_id) REFERENCES connected_facebook_pages(id) ON DELETE CASCADE
);

CREATE INDEX idx_instagram_account_id ON connected_instagram_accounts (instagram_account_id);
CREATE INDEX idx_instagram_facebook_page_id ON connected_instagram_accounts (facebook_page_id);

-- Trigger to call the function before each UPDATE operation
CREATE TRIGGER update_connected_instagram_accounts_updated_at
BEFORE UPDATE ON connected_instagram_accounts
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();