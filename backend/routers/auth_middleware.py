from fastapi import Depends
from auth import get_current_user

# This file can be used to create a reusable dependency
# For now, we'll add Depends(get_current_user) to each router individually

