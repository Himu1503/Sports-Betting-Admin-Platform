from pathlib import Path
import logging
import sys
import os


# Setting up the Logging for the Application
def setup_logging(log_level: str = "INFO", log_file: str = None) -> None:
    # Skip file logging on Vercel/serverless environments
    is_vercel = os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV") is not None
    use_file_logging = log_file and not is_vercel
    
    if use_file_logging:
        try:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            # If file logging can't be set up, continue without it
            use_file_logging = False
    
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    if use_file_logging:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(getattr(logging, log_level.upper()))
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception:
            # If file handler can't be created, continue without it
            pass
    
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    logging.info("Logging configured - Level: %s, File: %s", log_level, "enabled" if use_file_logging else "disabled (serverless)")


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

