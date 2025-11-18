#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("68HyhDBMe8rSesE5YMpG1LZuJuL1s24tcC7knd3dHgQc");

#[program]
pub mod voting {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        title: String,
        description: String,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        require!(start_time < end_time, VotingError::InvalidPollTime);
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time < start_time, VotingError::InvalidPollTime);

        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.creator = ctx.accounts.creator.key();
        poll.title = title;
        poll.description = description;
        poll.yes_votes = 0;
        poll.no_votes = 0;
        poll.created_at = Clock::get()?.unix_timestamp;
        poll.start_time = start_time;
        poll.end_time = end_time;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, poll_id: u64, vote_type: bool) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let voter = &mut ctx.accounts.voter;
        let current_time = Clock::get()?.unix_timestamp;

        // Verify we're voting on the correct poll
        require_eq!(poll.poll_id, poll_id, VotingError::PollMismatch);

        // Check if voting is within the allowed time window
        // Poll must have started and not ended
        require!(
            current_time >= poll.start_time,
            VotingError::PollNotStarted
        );
        require!(
            current_time <= poll.end_time,
            VotingError::PollEnded
        );

        // Check if voter has already voted on this poll
        require!(!voter.has_voted, VotingError::AlreadyVoted);

        if vote_type {
            poll.yes_votes = poll.yes_votes.checked_add(1).unwrap();
        } else {
            poll.no_votes = poll.no_votes.checked_add(1).unwrap();
        }

        voter.has_voted = true;
        voter.poll_id = poll_id;
        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        let poll = &ctx.accounts.poll;
        let signer = ctx.accounts.signer.key();
        let current_time = Clock::get()?.unix_timestamp;

        // // Check if signer is admin
        // let is_admin = signer == admin_pubkey;

        // Check if signer is the poll creator
        let is_creator = signer == poll.creator;

        // // Admin can close at any time
        // if is_admin {
        //     return Ok(());
        // }

        // Creator can only close if poll hasn't started yet
        if is_creator {
            require!(
                current_time < poll.start_time,
                VotingError::PollAlreadyStarted
            );
            return Ok(());
        }

        // If neither admin nor creator, unauthorized
        return Err(VotingError::Unauthorized.into());
    }
}

#[derive(Accounts)]
#[instruction(poll_id: u64, title: String, description: String)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        space = 8 + Poll::INIT_SPACE,
        payer = creator,
        seeds = [b"poll", &poll_id.to_le_bytes()[..]],
        bump
    )]
    pub poll: Account<'info, Poll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = [b"poll", &poll_id.to_le_bytes()[..]],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init_if_needed,
        space = 8 + Voter::INIT_SPACE,
        payer = voter_signer,
        seeds = [b"voter", &poll_id.to_le_bytes()[..], voter_signer.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,

    #[account(mut)]
    pub voter_signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, close = signer)]
    pub poll: Account<'info, Poll>,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub poll_id: u64,
    pub creator: Pubkey,
    #[max_len(200)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub created_at: i64,
    pub start_time: i64,
    pub end_time: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub poll_id: u64,
    pub has_voted: bool,
}

#[error_code]
pub enum VotingError {
    #[msg("This voter has already voted on this poll")]
    AlreadyVoted,
    #[msg("Unauthorized to close this poll")]
    Unauthorized,
    #[msg("Invalid poll time settings")]
    InvalidPollTime,
    #[msg("Poll ID mismatch")]
    PollMismatch,
    #[msg("Voting is not currently active for this poll")]
    VotingNotActive,
    #[msg("Poll has not started yet")]
    PollNotStarted,
    #[msg("Poll has already ended")]
    PollEnded,
    #[msg("Poll has already started and can only be closed by admin")]
    PollAlreadyStarted,
}