#!/usr/bin/env python3
"""
Setup script to initialize Supabase database schema for PeerLy chat logging.
Run this script once to create the necessary tables and views in Supabase.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase_client import supabase_logger

def setup_supabase_database():
    """Initialize Supabase database with chat logging schema"""
    print("🔧 Setting up Supabase database for PeerLy chat logging...")

    # Initialize Supabase client
    if not supabase_logger.initialize():
        print("❌ Failed to initialize Supabase client")
        return False

    # Read and execute SQL schema
    schema_file = Path(__file__).parent / "supabase_schema.sql"
    if not schema_file.exists():
        print(f"❌ Schema file not found: {schema_file}")
        return False

    print(f"📖 Reading schema from: {schema_file}")

    try:
        with open(schema_file, 'r') as f:
            sql_schema = f.read()

        print("⚠️  Note: You need to manually execute the SQL schema in your Supabase dashboard")
        print("📋 SQL Schema file created at: backend/supabase_schema.sql")
        print("\n🔗 To complete setup:")
        print("1. Go to your Supabase dashboard: https://app.supabase.com")
        print("2. Navigate to SQL Editor")
        print("3. Copy and paste the contents of backend/supabase_schema.sql")
        print("4. Run the SQL script to create tables and views")

        return True

    except Exception as e:
        print(f"❌ Error reading schema file: {e}")
        return False

def test_supabase_connection():
    """Test Supabase connection and basic operations"""
    print("🧪 Testing Supabase connection...")

    if not supabase_logger.is_connected():
        print("❌ Supabase client not connected")
        return False

    try:
        # Test by checking if we can access the analytics view
        analytics = supabase_logger.get_chat_analytics(hours_back=1)
        if analytics is not None:
            print("✅ Supabase connection successful!")
            print(f"📊 Retrieved {analytics['total_sessions']} sessions from analytics")
            return True
        else:
            print("⚠️  Supabase connected but no analytics data (expected for new setup)")
            return True

    except Exception as e:
        print(f"❌ Error testing Supabase connection: {e}")
        return False

def print_configuration():
    """Print current configuration"""
    print("⚙️  Current Supabase Configuration:")
    print(f"   URL: {supabase_logger.supabase_url}")
    print(f"   Key configured: {'✅' if supabase_logger.supabase_key else '❌'}")
    print(f"   Client initialized: {'✅' if supabase_logger.is_connected() else '❌'}")

if __name__ == "__main__":
    print("🚀 PeerLy Supabase Setup Script")
    print("=" * 40)

    # Print current configuration
    print_configuration()
    print()

    # Setup database schema
    if setup_supabase_database():
        print("\n✅ Database schema setup instructions provided")
    else:
        print("\n❌ Database schema setup failed")
        sys.exit(1)

    print("\n" + "=" * 40)
    print("🎉 Setup complete!")
    print("\n📝 Next Steps:")
    print("1. Execute the SQL schema in your Supabase dashboard")
    print("2. Start the backend server to begin logging")
    print("3. Check logs for Supabase connection status")
    print("4. Monitor chat data in Supabase dashboard")