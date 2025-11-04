-- All triggers and trigger functions for the betting platform database
-- This file should be loaded after schema (01) and before sample data (03)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update customer balance when balance_change is inserted
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance_amount DECIMAL(20, 4);
    current_currency currency_code;
    new_balance_amount DECIMAL(20, 4);
BEGIN
    -- Get current balance
    SELECT (balance).amount, (balance).currency 
    INTO current_balance_amount, current_currency
    FROM customers
    WHERE id = NEW.customer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with id % not found', NEW.customer_id;
    END IF;
    
    -- Calculate new balance
    new_balance_amount := current_balance_amount + (NEW.delta).amount;
    
    -- Check if the balance would go negative
    IF new_balance_amount < 0 THEN
        RAISE EXCEPTION 'Insufficient balance: operation would result in negative balance %', new_balance_amount;
    END IF;
    
    -- Update the customer balance
    UPDATE customers 
    SET balance = ROW(new_balance_amount, current_currency)::money_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_balance_on_change
AFTER INSERT ON balance_changes
FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- Function to validate balance_change currency matches customer currency
CREATE OR REPLACE FUNCTION validate_balance_change_currency()
RETURNS TRIGGER AS $$
DECLARE
    customer_currency currency_code;
BEGIN
    -- Get the customer's currency
    SELECT currency INTO customer_currency
    FROM customers
    WHERE id = NEW.customer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with id % not found', NEW.customer_id;
    END IF;
    
    -- Check that delta uses the customer's currency
    IF (NEW.delta).currency != customer_currency THEN
        RAISE EXCEPTION 'Balance change delta currency % does not match customer currency %', 
            (NEW.delta).currency, customer_currency;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_balance_change_currency_trigger
BEFORE INSERT ON balance_changes
FOR EACH ROW EXECUTE FUNCTION validate_balance_change_currency();

-- Ensure bets can only be placed on prematch or live events
CREATE OR REPLACE FUNCTION validate_bet_placement()
RETURNS TRIGGER AS $$
DECLARE
    event_status_val event_status;
BEGIN
    -- Only validate for new bets being placed (not historical settled bets)
    -- Historical bets will have an outcome already set
    IF NEW.outcome IS NULL AND NEW.placement_status = 'placed' THEN
        SELECT status INTO event_status_val
        FROM events
        WHERE id = NEW.event_id;

        IF event_status_val = 'finished' THEN
            RAISE EXCEPTION 'Cannot place bet on finished event %', NEW.event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_bet_placement_trigger
BEFORE INSERT OR UPDATE ON bets
FOR EACH ROW EXECUTE FUNCTION validate_bet_placement();

-- Ensure bet sports match event's competition sport
CREATE OR REPLACE FUNCTION validate_bet_sport()
RETURNS TRIGGER AS $$
DECLARE
    event_sport TEXT;
BEGIN
    SELECT c.sport INTO event_sport
    FROM events e
    JOIN competitions c ON e.competition_id = c.id
    WHERE e.id = NEW.event_id;
    
    IF event_sport != NEW.sport THEN
        RAISE EXCEPTION 'Bet sport % does not match event sport %', NEW.sport, event_sport;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_bet_sport_trigger
BEFORE INSERT OR UPDATE ON bets
FOR EACH ROW EXECUTE FUNCTION validate_bet_sport();

-- Validate team consistency in events
CREATE OR REPLACE FUNCTION validate_event_teams()
RETURNS TRIGGER AS $$
DECLARE
    team_a_sport TEXT;
    team_b_sport TEXT;
    comp_sport TEXT;
BEGIN
    -- Get sports for both teams
    SELECT sport INTO team_a_sport FROM teams WHERE id = NEW.team_a_id;
    SELECT sport INTO team_b_sport FROM teams WHERE id = NEW.team_b_id;
    SELECT sport INTO comp_sport FROM competitions WHERE id = NEW.competition_id;
    
    -- Ensure both teams play the same sport
    IF team_a_sport != team_b_sport THEN
        RAISE EXCEPTION 'Teams must play the same sport. Team A plays % but Team B plays %', 
            team_a_sport, team_b_sport;
    END IF;
    
    -- Ensure teams' sport matches competition sport
    IF team_a_sport != comp_sport THEN
        RAISE EXCEPTION 'Teams sport % does not match competition sport %', 
            team_a_sport, comp_sport;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_teams_trigger
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION validate_event_teams();

-- Ensure bet stakes match customer currency
CREATE OR REPLACE FUNCTION validate_bet_currency()
RETURNS TRIGGER AS $$
DECLARE
    customer_currency currency_code;
BEGIN
    SELECT currency INTO customer_currency
    FROM customers
    WHERE id = NEW.customer_id;
    
    IF (NEW.stake).currency != customer_currency THEN
        RAISE EXCEPTION 'Bet stake currency % does not match customer currency %', 
            (NEW.stake).currency, customer_currency;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_bet_currency_trigger
BEFORE INSERT OR UPDATE ON bets
FOR EACH ROW EXECUTE FUNCTION validate_bet_currency();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    id_field_name TEXT := TG_ARGV[0];
    pk_value TEXT;
BEGIN
    IF id_field_name IS NULL THEN
        id_field_name := 'id';
    END IF;

    -- Dynamically get the primary key value from the NEW or OLD record.
    -- This is a key step to make the trigger generic.
    IF TG_OP = 'DELETE' THEN
        EXECUTE format('SELECT ($1).%I', id_field_name) INTO pk_value USING OLD;
    ELSE
        EXECUTE format('SELECT ($1).%I', id_field_name) INTO pk_value USING NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, row_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP::audit_operation, pk_value::bigint, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP::audit_operation, pk_value::bigint, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, row_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP::audit_operation, pk_value::bigint, to_jsonb(OLD));
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_results_trigger
    AFTER INSERT OR UPDATE OR DELETE ON results
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function('event_id');

CREATE TRIGGER audit_customers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_balance_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON balance_changes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bets_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add constraint to ensure events are in the future when created as prematch
CREATE OR REPLACE FUNCTION validate_prematch_event_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'prematch' AND NEW.date < CURRENT_TIMESTAMP THEN
        -- Allow if updating existing event, but not for new inserts
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'Prematch events must be scheduled in the future';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_prematch_event_date_trigger
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION validate_prematch_event_date();

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY customer_stats;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Refresh stats when bets or balance changes
CREATE TRIGGER refresh_customer_stats_on_bet
AFTER INSERT OR UPDATE OR DELETE ON bets
FOR EACH STATEMENT EXECUTE FUNCTION refresh_customer_stats();

-- Function to deduct stake when bet is placed
CREATE OR REPLACE FUNCTION handle_bet_placement()
RETURNS TRIGGER AS $$
DECLARE
    customer_currency currency_code;
BEGIN
    -- Only process when a bet is successfully placed (not for failed bets)
    IF NEW.placement_status = 'placed' THEN
        -- Get customer currency
        SELECT currency INTO customer_currency
        FROM customers
        WHERE id = NEW.customer_id;
        
        -- Create balance change to deduct the stake
        INSERT INTO balance_changes (
            customer_id,
            change_type,
            delta,
            reference_id,
            description
        ) VALUES (
            NEW.customer_id,
            'bet_placed',
            ROW(-(NEW.stake).amount, customer_currency)::money_amount,
            'bet_' || NEW.id::TEXT,
            format('Placed bet %s', NEW.bookie_bet_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_bet_placement_trigger
AFTER INSERT ON bets
FOR EACH ROW
EXECUTE FUNCTION handle_bet_placement();

-- Function to create balance change when bet outcome changes from NULL
CREATE OR REPLACE FUNCTION handle_bet_outcome_change()
RETURNS TRIGGER AS $$
DECLARE
    balance_delta DECIMAL(20, 4);
    customer_currency currency_code;
    change_description TEXT;
BEGIN
    -- Only process when outcome changes from NULL to a non-NULL value
    IF OLD.outcome IS NULL AND NEW.outcome IS NOT NULL THEN
        -- Get customer currency for the balance change
        SELECT currency INTO customer_currency
        FROM customers
        WHERE id = NEW.customer_id;
        
        -- Calculate the balance delta based on outcome
        CASE NEW.outcome
            WHEN 'lose' THEN
                -- Loss: no change in balance (stake already deducted when bet was placed)
                balance_delta := 0;
                change_description := format('Bet %s settled as loss', NEW.id);
            WHEN 'void' THEN
                -- Void: return the original stake
                balance_delta := (NEW.stake).amount;
                change_description := format('Bet %s voided - stake returned', NEW.id);
            WHEN 'win' THEN
                -- Win: return stake * odds (payout amount)
                balance_delta := (NEW.stake).amount * NEW.odds;
                change_description := format('Bet %s won - payout at odds %s', NEW.id, NEW.odds);
        END CASE;
        
        -- Create the balance change record
        INSERT INTO balance_changes (
            customer_id,
            change_type,
            delta,
            reference_id,
            description
        ) VALUES (
            NEW.customer_id,
            'bet_settled',
            ROW(balance_delta, customer_currency)::money_amount,
            'bet_' || NEW.id::TEXT,
            change_description
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_bet_outcome_change_trigger
AFTER UPDATE ON bets
FOR EACH ROW 
WHEN (OLD.outcome IS DISTINCT FROM NEW.outcome)
EXECUTE FUNCTION handle_bet_outcome_change();

COMMENT ON TRIGGER validate_bet_placement_trigger ON bets IS 'Ensures bets can only be placed on non-finished events';
COMMENT ON TRIGGER validate_bet_sport_trigger ON bets IS 'Ensures bet sport matches the event competition sport';
COMMENT ON TRIGGER validate_event_teams_trigger ON events IS 'Ensures teams in an event play the same sport as the competition';
COMMENT ON TRIGGER validate_bet_currency_trigger ON bets IS 'Ensures bet stakes use the same currency as the customer';
COMMENT ON TRIGGER audit_events_trigger ON events IS 'Tracks all changes to events table for audit purposes';
COMMENT ON TRIGGER audit_results_trigger ON results IS 'Tracks all changes to results table for audit purposes';
COMMENT ON TRIGGER audit_customers_trigger ON customers IS 'Tracks all changes to customers table for audit purposes';
COMMENT ON TRIGGER audit_balance_changes_trigger ON balance_changes IS 'Tracks all changes to balance_changes table for audit purposes';
COMMENT ON TRIGGER audit_bets_trigger ON bets IS 'Tracks all changes to bets table for audit purposes';
COMMENT ON TRIGGER validate_prematch_event_date_trigger ON events IS 'Ensures prematch events are scheduled in the future';
COMMENT ON TRIGGER refresh_customer_stats_on_bet ON bets IS 'Refreshes materialized view when bets change';
COMMENT ON TRIGGER handle_bet_placement_trigger ON bets IS 'Deducts stake from customer balance when bet is placed';
COMMENT ON TRIGGER handle_bet_outcome_change_trigger ON bets IS 'Creates balance change when bet outcome changes from NULL to win/lose/void';