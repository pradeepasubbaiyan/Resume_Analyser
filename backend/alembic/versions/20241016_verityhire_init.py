"""Initial VerityHire schema

Revision ID: 20241016_init
Revises: 
Create Date: 2024-10-16 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '20241016_init'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'jobs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('recruiter_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('employment_type', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'candidate_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('target_role', sa.String(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('github_url', sa.String(), nullable=True),
        sa.Column('linkedin_url', sa.String(), nullable=True),
        sa.Column('portfolio_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.UniqueConstraint('user_id'),
    )


def downgrade() -> None:
    op.drop_table('candidate_profiles')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('jobs')
    op.drop_table('users')
