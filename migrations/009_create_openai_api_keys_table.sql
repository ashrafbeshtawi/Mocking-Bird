CREATE TABLE openai_api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TRIGGER set_updated_at_timestamp
BEFORE UPDATE ON openai_api_keys
FOR EACH ROW
EXECUTE PROCEDURE set_timestamp();