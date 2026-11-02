#!/usr/bin/env python3
"""
Analytics script to view and analyze PeerLy chat logs from Supabase.
Use this script to monitor user behavior and chat patterns.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase_client import supabase_logger

def print_chat_summary(hours_back: int = 24):
    """Print a summary of chat activity"""
    print(f"📊 Chat Activity Summary (Last {hours_back} hours)")
    print("=" * 50)

    if not supabase_logger.is_connected():
        print("❌ Supabase not connected")
        return

    try:
        # Get analytics data
        analytics = supabase_logger.get_chat_analytics(hours_back=hours_back)

        if not analytics or not analytics['analytics']:
            print("📭 No chat activity found in the specified timeframe")
            return

        print(f"📈 Total Sessions: {analytics['total_sessions']}")
        print(f"⏱️  Timeframe: Last {hours_back} hours")
        print()

        # Print analytics breakdown
        for record in analytics['analytics']:
            print(f"🕐 {record['hour_bucket']}:")
            print(f"   Mode: {record['room_mode']}")
            print(f"   Sessions: {record['session_count']}")
            print(f"   Avg Duration: {record['avg_duration_seconds']:.0f}s")
            print(f"   Avg Messages: {record['avg_messages_per_session']:.1f}")
            print(f"   Total Messages: {record['total_messages']}")
            print(f"   Total Skips: {record['total_skips']}")
            print(f"   Total Reports: {record['total_reports']}")
            print(f"   Total Games: {record['total_games']}")
            print()

    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")

def print_recent_sessions(limit: int = 10):
    """Print recent chat sessions"""
    print(f"📱 Recent Chat Sessions (Last {limit})")
    print("=" * 50)

    if not supabase_logger.is_connected():
        print("❌ Supabase not connected")
        return

    try:
        # Note: This would require additional method in supabase_client
        # For now, showing placeholder for what would be implemented
        print("🔍 Recent sessions feature requires additional implementation")
        print("💡 You can view sessions directly in Supabase dashboard:")
        print("   - Navigate to Table Editor")
        print("   - Select 'chat_sessions' table")
        print("   - Sort by 'started_at' descending")

    except Exception as e:
        print(f"❌ Error fetching recent sessions: {e}")

def print_user_behavior_insights():
    """Print insights about user behavior"""
    print("🧠 User Behavior Insights")
    print("=" * 50)

    if not supabase_logger.is_connected():
        print("❌ Supabase not connected")
        return

    try:
        analytics = supabase_logger.get_chat_analytics(hours_back=24)

        if not analytics or not analytics['analytics']:
            print("📭 No data available for insights")
            return

        total_sessions = sum(record['session_count'] for record in analytics['analytics'])
        total_messages = sum(record['total_messages'] for record in analytics['analytics'])
        total_skips = sum(record['total_skips'] for record in analytics['analytics'])
        total_reports = sum(record['total_reports'] for record in analytics['analytics'])
        total_games = sum(record['total_games'] for record in analytics['analytics'])

        if total_sessions > 0:
            avg_messages_per_session = total_messages / total_sessions
            skip_rate = (total_skips / total_sessions) * 100
            report_rate = (total_reports / total_sessions) * 100
            game_rate = (total_games / total_sessions) * 100

            print(f"📊 Overall Statistics (24h):")
            print(f"   Total Sessions: {total_sessions}")
            print(f"   Total Messages: {total_messages}")
            print(f"   Avg Messages/Session: {avg_messages_per_session:.1f}")
            print(f"   Skip Rate: {skip_rate:.1f}%")
            print(f"   Report Rate: {report_rate:.1f}%")
            print(f"   Game Rate: {game_rate:.1f}%")
            print()

            # Insights
            print("💡 Insights:")
            if skip_rate > 50:
                print("   ⚠️  High skip rate - users may be having trouble finding good matches")
            if avg_messages_per_session < 5:
                print("   💬 Low message count - conversations may be too short")
            if report_rate > 5:
                print("   🚨 High report rate - may need better moderation")
            if game_rate > 20:
                print("   🎮 High game engagement - users enjoy the interactive features")
            else:
                print("   🎮 Low game engagement - consider promoting games more")

        else:
            print("📭 No sessions to analyze")

    except Exception as e:
        print(f"❌ Error generating insights: {e}")

def print_connection_status():
    """Print Supabase connection status"""
    print("🔌 Connection Status")
    print("=" * 50)

    print(f"Supabase URL: {supabase_logger.supabase_url}")
    print(f"Client Connected: {'✅' if supabase_logger.is_connected() else '❌'}")

    if supabase_logger.is_connected():
        print("✅ Ready to log chat data")
    else:
        print("❌ Cannot log chat data - check configuration")

def main():
    """Main function to run analytics"""
    import argparse

    parser = argparse.ArgumentParser(description="PeerLy Chat Analytics")
    parser.add_argument("--hours", type=int, default=24, help="Hours of data to analyze")
    parser.add_argument("--summary", action="store_true", help="Show chat summary")
    parser.add_argument("--sessions", action="store_true", help="Show recent sessions")
    parser.add_argument("--insights", action="store_true", help="Show user behavior insights")
    parser.add_argument("--status", action="store_true", help="Show connection status")
    parser.add_argument("--all", action="store_true", help="Show all analytics")

    args = parser.parse_args()

    print("📊 PeerLy Chat Analytics")
    print("=" * 50)

    if args.status or args.all:
        print_connection_status()
        print()

    if args.summary or args.all:
        print_chat_summary(args.hours)
        print()

    if args.sessions or args.all:
        print_recent_sessions()
        print()

    if args.insights or args.all:
        print_user_behavior_insights()
        print()

    if not any([args.summary, args.sessions, args.insights, args.status, args.all]):
        # Default: show all
        print_connection_status()
        print()
        print_chat_summary(args.hours)
        print()
        print_user_behavior_insights()

if __name__ == "__main__":
    main()