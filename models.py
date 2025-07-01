from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from .database import Base

class LeadSource(Base):
    __tablename__ = "lead_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, nullable=False)

    leads = relationship("Lead", back_populates="source")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)

    assignments = relationship("Assignment", back_populates="user")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    company = Column(String)
    status = Column(String, default="new")
    source_id = Column(Integer, ForeignKey("lead_sources.id"))
    created_at = Column(TIMESTAMP)

    source = relationship("LeadSource", back_populates="leads")
    assignments = relationship("Assignment", back_populates="lead")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(TIMESTAMP)

    lead = relationship("Lead", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
