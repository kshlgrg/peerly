#!/usr/bin/env python3
"""
Quick test script to verify Supabase setup and logging functionality.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from supabase_client import supabase_logger

def test_supabase_setup():
    """Test Supabase connection and basic functionality"""
    print("🧪 Testing Supabase Setup")
    print("=" * 30)

    # Test 1: Initialize client
    print("1. Testing client initialization...")
    if supabase_logger.initialize():
        print("✅ Supabase client initialized successfully")
    else:
        print("❌ Failed to initialize Supabase client")
        return False

    # Test 2: Check connection
    print("\n2. Testing connection...")
    if supabase_logger.is_connected():
        print("✅ Supabase connection active")
    else:
        print("❌ Supabase connection failed")
        return False

    # Test 3: Test logging (will fail if schema not set up)
    print("\n3. Testing chat logging...")
    try:
        success = supabase_logger.log_chat_message(
            session_id="test-session-123",
            client_id="test-client-456",
            client_ip="127.0.0.1",
            user_type="user1",
            message_type="test",
            message_content="Test message",
            room_mode="text"
        )
        if success:
            print("✅ Chat logging test successful")
        else:
            print("⚠️  Chat logging failed (schema may not be set up yet)")
    except Exception as e:
        print(f"❌ Chat logging test failed: {e}")

    # Test 4: Test session creation
    print("\n4. Testing session creation...")
    try:
        success = supabase_logger.create_chat_session(
            session_id="test-session-123",
            client1_id="test-client-456",
            client1_ip="127.0.0.1",
            room_mode="text"
        )
        if success:
            print("✅ Session creation test successful")
        else:
            print("⚠️  Session creation failed (schema may not be set up yet)")
    except Exception as e:
        print(f"❌ Session creation test failed: {e}")

    print("\n🎉 Setup test complete!")
    print("\n📝 Next steps:")
    print("1. If logging failed, run: python setup_supabase.py")
    print("2. Execute SQL schema in Supabase dashboard")
    print("3. Restart backend server to enable logging")

    return True

def print_environment_info():
    """Print current environment configuration"""
    print("🔧 Environment Configuration")
    print("=" * 30)

    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'Not set')}")
    print(f"SUPABASE_SERVICE_KEY: {'Set' if os.getenv('SUPABASE_SERVICE_KEY') else 'Not set'}")
    print(f"SUPABASE_PUBLISHABLE_KEY: {'Set' if os.getenv('SUPABASE_PUBLISHABLE_KEY') else 'Not set'}")

if __name__ == "__main__":
    print_environment_info()
    print()
    test_supabase_setup()