-- Sample data for betting platform

-- Insert sports
INSERT INTO sports (name) VALUES 
    ('Football'),
    ('Basketball'),
    ('Tennis'),
    ('Cricket'),
    ('Baseball');

-- Insert teams
INSERT INTO teams (name, country, sport) VALUES 
    ('Manchester United', 'England', 'Football'),
    ('Liverpool', 'England', 'Football'),
    ('Real Madrid', 'Spain', 'Football'),
    ('Barcelona', 'Spain', 'Football'),
    ('Bayern Munich', 'Germany', 'Football'),
    ('PSG', 'France', 'Football'),
    ('Juventus', 'Italy', 'Football'),
    ('AC Milan', 'Italy', 'Football'),
    ('Los Angeles Lakers', 'USA', 'Basketball'),
    ('Boston Celtics', 'USA', 'Basketball'),
    ('Golden State Warriors', 'USA', 'Basketball'),
    ('Chicago Bulls', 'USA', 'Basketball');

-- Insert competitions
INSERT INTO competitions (name, country, sport, active) VALUES 
    ('Premier League', 'England', 'Football', true),
    ('La Liga', 'Spain', 'Football', true),
    ('Champions League', 'Europe', 'Football', true),
    ('NBA', 'USA', 'Basketball', true),
    ('Wimbledon', 'England', 'Tennis', true),
    ('US Open', 'USA', 'Tennis', true),
    ('First Division', 'England', 'Football', false),  -- Example of retired competition
    ('European Cup Winners Cup', 'Europe', 'Football', false);  -- Another retired competition

-- Insert customers with hashed passwords (using simple hash for demo - in production use bcrypt)
INSERT INTO customers (username, password, real_name, currency, balance, status, preferences) VALUES 
    ('john_doe', '$2a$10$YourHashedPasswordHere1', 'John Doe', 'USD', ROW(0.0000, 'USD'::currency_code)::money_amount, 'active', '{"favorite_sport": "Football", "notifications": true}'),
    ('jane_smith', '$2a$10$YourHashedPasswordHere2', 'Jane Smith', 'USD', ROW(0.0000, 'USD'::currency_code)::money_amount, 'active', '{"favorite_sport": "Basketball", "notifications": false}'),
    ('bob_wilson', '$2a$10$YourHashedPasswordHere3', 'Bob Wilson', 'GBP', ROW(0.0000, 'GBP'::currency_code)::money_amount, 'active', '{"favorite_sport": "Tennis"}'),
    ('alice_brown', '$2a$10$YourHashedPasswordHere4', 'Alice Brown', 'EUR', ROW(0.0000, 'EUR'::currency_code)::money_amount, 'disabled', '{}'),
    ('charlie_davis', '$2a$10$YourHashedPasswordHere5', 'Charlie Davis', 'USD', ROW(0.0000, 'USD'::currency_code)::money_amount, 'active', '{"favorite_sport": "Football", "preferred_odds_format": "decimal"}');

-- Insert bookies
INSERT INTO bookies (name, description, preferences) VALUES 
    ('BetMaster', 'Leading online sports betting platform', '{"commission_rate": 0.05, "supported_sports": ["Football", "Basketball", "Tennis"]}'),
    ('SportsBet Pro', 'Professional sports betting service', '{"commission_rate": 0.04, "supported_sports": ["Football", "Basketball", "Baseball", "Cricket"]}'),
    ('QuickBet', 'Fast and reliable betting', '{"commission_rate": 0.06, "supported_sports": ["Football", "Tennis"]}');

-- Insert events (mix of past, current, and future)
INSERT INTO events (date, competition_id, team_a_id, team_b_id, status) VALUES 
    ((CURRENT_TIMESTAMP - INTERVAL '7 day')::DATE + TIME '15:00:00+00', 1, 1, 2, 'finished'),  -- Man United vs Liverpool
    ((CURRENT_TIMESTAMP - INTERVAL '5 day')::DATE + TIME '20:00:00+00', 2, 3, 4, 'finished'),  -- Real Madrid vs Barcelona
    ((CURRENT_TIMESTAMP - INTERVAL '3 day')::DATE + TIME '19:45:00+00', 3, 5, 7, 'finished'),  -- Bayern vs Juventus
    ((CURRENT_TIMESTAMP - INTERVAL '2 day')::DATE + TIME '18:30:00+00', 1, 2, 1, 'finished'),  -- Liverpool vs Man United (return)
    ((CURRENT_TIMESTAMP + INTERVAL '2 day')::DATE + TIME '15:00:00+00', 1, 1, 2, 'prematch'),  -- Future: Man United vs Liverpool
    ((CURRENT_TIMESTAMP + INTERVAL '5 day')::DATE + TIME '20:00:00+00', 2, 3, 4, 'prematch'),  -- Future: Real Madrid vs Barcelona
    (CURRENT_TIMESTAMP, 4, 9, 10, 'live'),     -- Lakers vs Celtics (assuming today's match)
    ((CURRENT_TIMESTAMP + INTERVAL '1 day')::DATE + TIME '19:00:00+00', 4, 11, 12, 'prematch');-- Warriors vs Bulls

-- Insert results for finished events
INSERT INTO results (event_id, score_a, score_b) VALUES
    (1, 1, 2),  -- Man United (team_a) 1-2 Liverpool (team_b)
    (2, 3, 2),  -- Real Madrid (team_a) 3-2 Barcelona (team_b)
    (3, 2, 2),  -- Bayern (team_a) 2-2 Juventus (team_b)
    (4, 1, 0);  -- Liverpool (team_a) 1-0 Man United (team_b)

-- Insert balance changes that will update customer balances via trigger
INSERT INTO balance_changes (customer_id, change_type, delta, description) VALUES
    (1, 'top_up', ROW(1500.0000, 'USD'::currency_code)::money_amount, 'Initial deposit'),
    (2, 'top_up', ROW(2000.0000, 'USD'::currency_code)::money_amount, 'Initial deposit'),
    (3, 'top_up', ROW(1000.0000, 'GBP'::currency_code)::money_amount, 'Initial deposit'),
    (5, 'top_up', ROW(1000.0000, 'USD'::currency_code)::money_amount, 'Initial deposit');

-- Insert bets (mix of different statuses and outcomes)
INSERT INTO bets (bookie, customer_id, bookie_bet_id, bet_type, event_id, sport, placement_status, outcome, stake, odds, placement_data) VALUES 
    -- Recent placed bets (not yet settled)
    ('BetMaster', 1, 'BM-2025-001', 'match_winner', 5, 'Football', 'placed', NULL, ROW(50.0000, 'USD'::currency_code)::money_amount, 2.10, '{"selection": "home_win", "market": "1X2"}'),
    ('SportsBet Pro', 2, 'SP-2025-001', 'match_winner', 6, 'Football', 'placed', NULL, ROW(100.0000, 'USD'::currency_code)::money_amount, 1.65, '{"selection": "home_win", "market": "1X2"}'),
    ('QuickBet', 3, 'QB-2025-001', 'total_points', 7, 'Basketball', 'placed', NULL, ROW(75.0000, 'GBP'::currency_code)::money_amount, 1.90, '{"selection": "over_210.5", "market": "total_points"}'),
    
    -- Failed bet attempts
    ('BetMaster', 4, 'BM-2025-F01', 'match_winner', 5, 'Football', 'failed', NULL, ROW(100.0000, 'EUR'::currency_code)::money_amount, 2.00, '{"selection": "draw", "market": "1X2", "error": "insufficient_balance"}');

-- Test the new trigger by settling some of the unsettled bets
-- These updates will automatically create balance_changes via the handle_bet_outcome_change trigger
UPDATE bets SET outcome = 'win' WHERE bookie_bet_id = 'BM-2025-001';
UPDATE bets SET outcome = 'lose' WHERE bookie_bet_id = 'SP-2025-001';
UPDATE bets SET outcome = 'void' WHERE bookie_bet_id = 'QB-2025-001';
