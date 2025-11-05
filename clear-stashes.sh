#!/bin/bash

# A script to safely clear all Git stashes in the current repository.

# Set color for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# First, check if there are any stashes to clear.
if ! git rev-parse --git-dir > /dev/null 2>&1 || ! git stash list | grep -q 'stash@'; then
    echo -e "${GREEN}No Git repository or no stashes found to clear.${NC}"
    exit 0
fi

echo "The following stashes will be ${RED}permanently deleted${NC}:"
git stash list
echo "" # Add a newline for readability

# Ask for user confirmation
read -p "Are you sure you want to delete all stashes? This cannot be undone. (y/n) " -n 1 -r
echo "" # Move to a new line

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Clearing all stashes..."
    git stash clear
    echo -e "${GREEN}All stashes have been cleared.${NC}"
else
    echo "Operation cancelled."
fi