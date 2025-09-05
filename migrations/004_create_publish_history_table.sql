-- First create the enum type
CREATE TYPE publish_status_enum AS ENUM ('success', 'partial_success', 'failed');

-- Then create the table with the new column
CREATE TABLE publish_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    publish_report TEXT,
    publish_status publish_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
