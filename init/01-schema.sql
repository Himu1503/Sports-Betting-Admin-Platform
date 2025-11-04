-- PostgreSQL schema for sports betting platform
-- Created for take-home assignment


-- Create ENUM types
CREATE TYPE currency_code AS ENUM ('USD', 'GBP', 'EUR');
CREATE TYPE event_status AS ENUM ('prematch', 'live', 'finished');
CREATE TYPE customer_status AS ENUM ('active', 'disabled');
CREATE TYPE balance_change_type AS ENUM ('top_up', 'bet_placed', 'bet_settled', 'withdrawal', 'adjustment');
CREATE TYPE placement_status AS ENUM ('pending', 'placed', 'failed');
CREATE TYPE bet_outcome AS ENUM ('win', 'lose', 'void');
CREATE TYPE audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Create custom money type with currency
CREATE TYPE money_amount AS (
    amount DECIMAL(20, 4),
    currency currency_code
);

-- Sports table (using name as primary key)
CREATE TABLE sports (name TEXT PRIMARY KEY);

-- Teams table
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    sport TEXT NOT NULL REFERENCES sports(name) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_team_name_country UNIQUE (sport, country, name)
);

-- Indexes for teams
CREATE INDEX idx_teams_sport_country_name ON teams(sport, country, name);
CREATE INDEX idx_teams_created_at ON teams(created_at);
CREATE INDEX idx_teams_updated_at ON teams(updated_at);

-- Competitions table
CREATE TABLE competitions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    sport TEXT NOT NULL REFERENCES sports(name) ON DELETE RESTRICT,
    active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for competitions
CREATE INDEX idx_competitions_sport ON competitions(sport);
CREATE INDEX idx_competitions_active ON competitions(active);

-- Events table
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    competition_id BIGINT NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
    team_a_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    team_b_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    status event_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_teams CHECK (team_a_id != team_b_id)
);

-- Indexes for events
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_competition_id ON events(competition_id);
CREATE INDEX idx_events_team_a_id ON events(team_a_id);
CREATE INDEX idx_events_team_b_id ON events(team_b_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_updated_at ON events(updated_at);

-- Results table (using event_id as primary key)
CREATE TABLE results (
    event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE RESTRICT,
    score_a INTEGER CHECK (score_a >= 0),
    score_b INTEGER CHECK (score_b >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for results
CREATE INDEX idx_results_created_at ON results(created_at);
CREATE INDEX idx_results_updated_at ON results(updated_at);

-- Customers table
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Should store hashed passwords
    real_name TEXT NOT NULL,
    currency currency_code NOT NULL,
    status customer_status NOT NULL,
    balance money_amount NOT NULL CHECK ((balance).currency = currency),
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for customers
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_updated_at ON customers(updated_at);

-- Bookies table
CREATE TABLE bookies (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}'
);

-- Balance changes table for tracking all customer balance modifications
CREATE TABLE balance_changes (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    change_type balance_change_type NOT NULL,
    delta money_amount NOT NULL,
    reference_id TEXT, -- Can reference bet_id or other transaction IDs
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for balance_changes
CREATE INDEX idx_balance_changes_customer_id ON balance_changes(customer_id);
CREATE INDEX idx_balance_changes_change_type ON balance_changes(change_type);
CREATE INDEX idx_balance_changes_created_at ON balance_changes(created_at);

-- Bets table
CREATE TABLE bets (
    id BIGSERIAL PRIMARY KEY,
    bookie TEXT NOT NULL REFERENCES bookies(name) ON DELETE RESTRICT,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    bookie_bet_id TEXT NOT NULL,
    bet_type TEXT NOT NULL,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    sport TEXT NOT NULL REFERENCES sports(name) ON DELETE RESTRICT,
    placement_status placement_status NOT NULL DEFAULT 'pending',
    outcome bet_outcome, -- NULL until bet is settled
    stake money_amount NOT NULL CHECK ((stake).amount > 0),
    odds DECIMAL(20, 10) NOT NULL CHECK (odds >= 1.01 and odds <= 999.0),
    placement_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_outcome CHECK (
        (placement_status = 'failed' AND outcome IS NULL) OR
        (placement_status = 'pending' AND outcome IS NULL) OR
        (placement_status = 'placed')
    ),
    CONSTRAINT unique_bookie_bet_id UNIQUE (bookie, bookie_bet_id)
);

-- Indexes for bets
CREATE INDEX idx_bets_bookie ON bets(bookie);
CREATE INDEX idx_bets_customer_id ON bets(customer_id);
CREATE INDEX idx_bets_event_id ON bets(event_id);
CREATE INDEX idx_bets_sport ON bets(sport);
CREATE INDEX idx_bets_placement_status ON bets(placement_status);
CREATE INDEX idx_bets_outcome ON bets(outcome);
CREATE INDEX idx_bets_created_at ON bets(created_at);
CREATE INDEX idx_bets_updated_at ON bets(updated_at);

-- Audit log table for important changes
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation audit_operation NOT NULL,
    username TEXT NOT NULL DEFAULT CURRENT_USER,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_id BIGINT,
    old_data JSONB,
    new_data JSONB
);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);
CREATE INDEX idx_audit_log_username ON audit_log(username);

-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

-- Customer betting statistics
CREATE MATERIALIZED VIEW customer_stats AS
SELECT 
    c.id as customer_id,
    c.username,
    c.currency,
    COUNT(b.id) as total_bets,
    COUNT(b.id) FILTER (WHERE b.outcome = 'win') as won_bets,
    COUNT(b.id) FILTER (WHERE b.outcome = 'lose') as lost_bets,
    COUNT(b.id) FILTER (WHERE b.outcome = 'void') as void_bets,
    COALESCE(SUM((b.stake).amount) FILTER (WHERE b.placement_status = 'placed'), 0) as total_staked,
    COALESCE(SUM((b.stake).amount * b.odds) FILTER (WHERE b.outcome = 'win'), 0) as total_won,
    COALESCE(SUM((b.stake).amount * b.odds) FILTER (WHERE b.outcome = 'win'), 0) - 
        COALESCE(SUM((b.stake).amount) FILTER (WHERE b.outcome IN ('win', 'lose')), 0) as net_profit,
    (c.balance).amount as current_balance
FROM customers c
LEFT JOIN bets b ON c.id = b.customer_id
GROUP BY c.id, c.username, c.currency, c.balance;

CREATE UNIQUE INDEX idx_customer_stats_customer_id ON customer_stats(customer_id);

COMMENT ON TABLE audit_log IS 'Audit trail for changes to critical tables';
COMMENT ON MATERIALIZED VIEW customer_stats IS 'Aggregated betting statistics per customer for reporting';
