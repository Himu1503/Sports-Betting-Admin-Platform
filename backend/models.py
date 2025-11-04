# Models for Validation 
from typing import Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
from decimal import Decimal
import re


class MoneyAmount(BaseModel):
    amount: Decimal = Field(..., description="Amount value (can be negative for balance changes)")
    currency: str = Field(..., description="Currency code (USD, GBP, EUR)")
    
    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        valid_currencies = {'USD', 'GBP', 'EUR'}
        if v.upper() not in valid_currencies:
            raise ValueError(f"Currency must be one of {valid_currencies}")
        return v.upper()


# Sports Models
class SportBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Sport name")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Sport name cannot be empty")
        return v


class Sport(SportBase):
    pass


# Teams Models
class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Team name")
    country: str = Field(..., min_length=1, max_length=100, description="Team country")
    sport: str = Field(..., min_length=1, max_length=100, description="Sport name")
    
    @field_validator('name', 'country', 'sport')
    @classmethod
    def validate_string_fields(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    country: Optional[str] = Field(None, min_length=1, max_length=100)
    sport: Optional[str] = Field(None, min_length=1, max_length=100)
    
    @field_validator('name', 'country', 'sport', mode='before')
    @classmethod
    def validate_string_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
        return v


class Team(TeamBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Competitions Models
class CompetitionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Competition name")
    country: str = Field(..., min_length=1, max_length=100, description="Competition country")
    sport: str = Field(..., min_length=1, max_length=100, description="Sport name")
    active: bool = Field(default=True, description="Whether competition is active")
    
    @field_validator('name', 'country', 'sport')
    @classmethod
    def validate_string_fields(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class CompetitionCreate(CompetitionBase):
    pass


class CompetitionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    country: Optional[str] = Field(None, min_length=1, max_length=100)
    sport: Optional[str] = Field(None, min_length=1, max_length=100)
    active: Optional[bool] = None
    
    @field_validator('name', 'country', 'sport', mode='before')
    @classmethod
    def validate_string_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty")
        return v


class Competition(CompetitionBase):
    id: int

    class Config:
        from_attributes = True


# Events Models
class EventBase(BaseModel):
    date: datetime = Field(..., description="Event date and time")
    competition_id: int = Field(..., gt=0, description="Competition ID (must be > 0)")
    team_a_id: int = Field(..., gt=0, description="Team A ID (must be > 0)")
    team_b_id: int = Field(..., gt=0, description="Team B ID (must be > 0)")
    status: str = Field(..., description="Event status (prematch, live, finished)")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {'prematch', 'live', 'finished'}
        if v.lower() not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v.lower()
    
    @model_validator(mode='after')
    def validate_teams_different(self):
        if self.team_a_id == self.team_b_id:
            raise ValueError("Team A and Team B must be different")
        return self


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    date: Optional[datetime] = None
    competition_id: Optional[int] = Field(None, gt=0)
    team_a_id: Optional[int] = Field(None, gt=0)
    team_b_id: Optional[int] = Field(None, gt=0)
    status: Optional[str] = None
    
    @field_validator('status', mode='before')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_statuses = {'prematch', 'live', 'finished'}
            if v.lower() not in valid_statuses:
                raise ValueError(f"Status must be one of {valid_statuses}")
            return v.lower()
        return v
    
    @model_validator(mode='after')
    def validate_teams_different(self):
        if self.team_a_id is not None and self.team_b_id is not None:
            if self.team_a_id == self.team_b_id:
                raise ValueError("Team A and Team B must be different")
        return self


class Event(EventBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Results Models
class ResultBase(BaseModel):
    event_id: int = Field(..., gt=0, description="Event ID (must be > 0)")
    score_a: Optional[int] = Field(None, ge=0, description="Team A score (must be >= 0)")
    score_b: Optional[int] = Field(None, ge=0, description="Team B score (must be >= 0)")


class ResultCreate(ResultBase):
    pass


class ResultUpdate(BaseModel):
    score_a: Optional[int] = Field(None, ge=0)
    score_b: Optional[int] = Field(None, ge=0)


class Result(ResultBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Customers Models
class CustomerBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Customer username")
    password: str = Field(..., min_length=1, description="Customer password (hashed)")
    real_name: str = Field(..., min_length=1, max_length=200, description="Customer real name")
    currency: str = Field(..., description="Currency code")
    status: str = Field(..., description="Customer status (active, disabled)")
    balance: MoneyAmount = Field(..., description="Current balance")
    preferences: dict[str, Any] = Field(default_factory=dict, description="Customer preferences")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 50:
            raise ValueError("Username must be at most 50 characters")
        return v
    
    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        valid_currencies = {'USD', 'GBP', 'EUR'}
        if v.upper() not in valid_currencies:
            raise ValueError(f"Currency must be one of {valid_currencies}")
        return v.upper()
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {'active', 'disabled'}
        if v.lower() not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v.lower()
    
    @field_validator('real_name')
    @classmethod
    def validate_real_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Real name cannot be empty")
        if len(v) > 200:
            raise ValueError("Real name must be at most 200 characters")
        return v


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=1)
    real_name: Optional[str] = Field(None, min_length=1, max_length=200)
    currency: Optional[str] = None
    status: Optional[str] = None
    balance: Optional[MoneyAmount] = None
    preferences: Optional[dict[str, Any]] = None
    
    @field_validator('username', mode='before')
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError("Username can only contain letters, numbers, and underscores")
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters")
            if len(v) > 50:
                raise ValueError("Username must be at most 50 characters")
        return v
    
    @field_validator('currency', mode='before')
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_currencies = {'USD', 'GBP', 'EUR'}
            if v.upper() not in valid_currencies:
                raise ValueError(f"Currency must be one of {valid_currencies}")
            return v.upper()
        return v
    
    @field_validator('status', mode='before')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_statuses = {'active', 'disabled'}
            if v.lower() not in valid_statuses:
                raise ValueError(f"Status must be one of {valid_statuses}")
            return v.lower()
        return v
    
    @field_validator('real_name', mode='before')
    @classmethod
    def validate_real_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Real name cannot be empty")
            if len(v) > 200:
                raise ValueError("Real name must be at most 200 characters")
        return v


class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bookies Models
class BookieBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Bookie name")
    description: str = Field(..., min_length=1, max_length=500, description="Bookie description")
    preferences: dict[str, Any] = Field(default_factory=dict, description="Bookie preferences")
    
    @field_validator('name', 'description')
    @classmethod
    def validate_string_fields(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class BookieCreate(BookieBase):
    pass


class BookieUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    preferences: Optional[dict[str, Any]] = None
    
    @field_validator('description', mode='before')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Description cannot be empty")
            if len(v) > 500:
                raise ValueError("Description must be at most 500 characters")
        return v


class Bookie(BookieBase):
    pass

    class Config:
        from_attributes = True


# Balance Changes Models
class BalanceChangeBase(BaseModel):
    customer_id: int = Field(..., gt=0, description="Customer ID (must be > 0)")
    change_type: str = Field(..., description="Change type")
    delta: MoneyAmount = Field(..., description="Balance change amount")
    reference_id: Optional[str] = Field(None, max_length=100, description="Reference ID")
    description: Optional[str] = Field(None, max_length=500, description="Change description")
    
    @field_validator('change_type')
    @classmethod
    def validate_change_type(cls, v: str) -> str:
        valid_types = {'top_up', 'bet_placed', 'bet_settled', 'withdrawal', 'adjustment'}
        if v.lower() not in valid_types:
            raise ValueError(f"Change type must be one of {valid_types}")
        return v.lower()
    
    @field_validator('delta')
    @classmethod
    def validate_delta(cls, v: MoneyAmount) -> MoneyAmount:
        # Delta amount should be > 0 for positive changes, but can be negative for withdrawals
        # We'll let the database trigger handle the balance validation
        return v


class BalanceChangeCreate(BalanceChangeBase):
    pass


class BalanceChange(BalanceChangeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Bets Models
class BetBase(BaseModel):
    bookie: str = Field(..., min_length=1, max_length=100, description="Bookie name")
    customer_id: int = Field(..., gt=0, description="Customer ID (must be > 0)")
    bookie_bet_id: str = Field(..., min_length=1, max_length=200, description="Bookie bet ID")
    bet_type: str = Field(..., min_length=1, max_length=100, description="Bet type")
    event_id: int = Field(..., gt=0, description="Event ID (must be > 0)")
    sport: str = Field(..., min_length=1, max_length=100, description="Sport name")
    placement_status: str = Field(default="pending", description="Placement status")
    outcome: Optional[str] = Field(None, description="Bet outcome")
    stake: MoneyAmount = Field(..., description="Stake amount")
    odds: Decimal = Field(..., ge=1.01, le=999.0, description="Odds")
    placement_data: dict[str, Any] = Field(default_factory=dict, description="Placement data")
    
    @field_validator('placement_status')
    @classmethod
    def validate_placement_status(cls, v: str) -> str:
        valid_statuses = {'pending', 'placed', 'failed'}
        if v.lower() not in valid_statuses:
            raise ValueError(f"Placement status must be one of {valid_statuses}")
        return v.lower()
    
    @field_validator('outcome', mode='before')
    @classmethod
    def validate_outcome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != '':
            valid_outcomes = {'win', 'lose', 'void'}
            if v.lower() not in valid_outcomes:
                raise ValueError(f"Outcome must be one of {valid_outcomes}")
            return v.lower()
        return None
    
    @field_validator('stake')
    @classmethod
    def validate_stake(cls, v: MoneyAmount) -> MoneyAmount:
        if v.amount <= 0:
            raise ValueError("Stake amount must be greater than 0")
        return v


class BetCreate(BetBase):
    pass


class BetUpdate(BaseModel):
    bookie: Optional[str] = Field(None, min_length=1, max_length=100)
    customer_id: Optional[int] = Field(None, gt=0)
    bookie_bet_id: Optional[str] = Field(None, min_length=1, max_length=200)
    bet_type: Optional[str] = Field(None, min_length=1, max_length=100)
    event_id: Optional[int] = Field(None, gt=0)
    sport: Optional[str] = Field(None, min_length=1, max_length=100)
    placement_status: Optional[str] = None
    outcome: Optional[str] = None
    stake: Optional[MoneyAmount] = None
    odds: Optional[Decimal] = Field(None, ge=1.01, le=999.0)
    placement_data: Optional[dict[str, Any]] = None
    
    @field_validator('placement_status', mode='before')
    @classmethod
    def validate_placement_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_statuses = {'pending', 'placed', 'failed'}
            if v.lower() not in valid_statuses:
                raise ValueError(f"Placement status must be one of {valid_statuses}")
            return v.lower()
        return v
    
    @field_validator('outcome', mode='before')
    @classmethod
    def validate_outcome(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != '':
            valid_outcomes = {'win', 'lose', 'void'}
            if v.lower() not in valid_outcomes:
                raise ValueError(f"Outcome must be one of {valid_outcomes}")
            return v.lower()
        return None
    
    @field_validator('stake', mode='before')
    @classmethod
    def validate_stake(cls, v: Optional[MoneyAmount]) -> Optional[MoneyAmount]:
        if v is not None and v.amount <= 0:
            raise ValueError("Stake amount must be greater than 0")
        return v


class Bet(BetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Audit Log Models
class AuditLog(BaseModel):
    id: int
    table_name: str
    operation: str
    username: str
    changed_at: datetime
    row_id: Optional[int]
    old_data: Optional[dict[str, Any]]
    new_data: Optional[dict[str, Any]]

    class Config:
        from_attributes = True


# Error Models
class ErrorResponse(BaseModel):
    detail: str
