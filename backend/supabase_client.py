import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SupabaseLogger:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self.client: Optional[Client] = None

    def initialize(self):
        """Initialize Supabase client with service role key"""
        if not self.supabase_url or not self.supabase_key:
            print("⚠️ Supabase URL or Service Key not configured in environment variables, skipping logger initialization")
            return False
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            print("✅ Supabase client initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            return False

    def is_connected(self) -> bool:
        """Check if Supabase client is connected"""
        return self.client is not None

    def log_chat_message(
        self,
        session_id: str,
        client_id: str,
        client_ip: str,
        user_type: str,  # 'user1' or 'user2'
        message_type: str,
        message_content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        matched_at: Optional[datetime] = None,
        room_mode: str = "text"
    ) -> bool:
        """Log a chat message to Supabase"""
        if not self.is_connected():
            print("⚠️ Supabase not connected, skipping log")
            return False

        try:
            log_data = {
                "session_id": session_id,
                "client_id": client_id,
                "client_ip": client_ip,
                "user_type": user_type,
                "message_type": message_type,
                "message_content": message_content,
                "metadata": metadata or {},
                "matched_at": matched_at.isoformat() if matched_at else None,
                "room_mode": room_mode
            }

            response = self.client.table("chat_logs").insert(log_data).execute()

            if response.data:
                return True
            else:
                print(f"⚠️ Failed to log chat message: {response}")
                return False

        except Exception as e:
            print(f"❌ Error logging chat message: {e}")
            return False

    def create_chat_session(
        self,
        session_id: str,
        client1_id: str,
        client1_ip: str,
        client2_id: Optional[str] = None,
        client2_ip: Optional[str] = None,
        room_mode: str = "text"
    ) -> bool:
        """Create a new chat session in Supabase"""
        if not self.is_connected():
            print("⚠️ Supabase not connected, skipping session creation")
            return False

        try:
            session_data = {
                "session_id": session_id,
                "client1_id": client1_id,
                "client1_ip": client1_ip,
                "client2_id": client2_id,
                "client2_ip": client2_ip,
                "room_mode": room_mode
            }

            response = self.client.table("chat_sessions").insert(session_data).execute()

            if response.data:
                return True
            else:
                print(f"⚠️ Failed to create chat session: {response}")
                return False

        except Exception as e:
            print(f"❌ Error creating chat session: {e}")
            return False

    def end_chat_session(
        self,
        session_id: str,
        end_reason: str = "disconnect"
    ) -> bool:
        """End a chat session and calculate duration"""
        if not self.is_connected():
            print("⚠️ Supabase not connected, skipping session end")
            return False

        try:
            # Get session start time
            session_response = self.client.table("chat_sessions").select("started_at").eq("session_id", session_id).execute()

            if not session_response.data:
                print(f"⚠️ Session not found: {session_id}")
                return False

            started_at = session_response.data[0]["started_at"]
            ended_at = datetime.now(timezone.utc)

            # Calculate duration in seconds
            if isinstance(started_at, str):
                started_at_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            else:
                started_at_dt = started_at

            duration_seconds = int((ended_at - started_at_dt).total_seconds())

            # Update session
            update_data = {
                "ended_at": ended_at.isoformat(),
                "session_duration_seconds": duration_seconds,
                "end_reason": end_reason
            }

            response = self.client.table("chat_sessions").update(update_data).eq("session_id", session_id).execute()

            if response.data:
                return True
            else:
                print(f"⚠️ Failed to end chat session: {response}")
                return False

        except Exception as e:
            print(f"❌ Error ending chat session: {e}")
            return False

    def get_chat_analytics(
        self,
        hours_back: int = 24,
        room_mode: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get chat analytics from Supabase"""
        if not self.is_connected():
            print("⚠️ Supabase not connected, skipping analytics")
            return None

        try:
            query = self.client.table("chat_analytics").select("*")

            if room_mode:
                query = query.eq("room_mode", room_mode)

            response = query.execute()

            if response.data:
                return {
                    "analytics": response.data,
                    "total_sessions": len(response.data),
                    "timeframe_hours": hours_back
                }
            else:
                return None

        except Exception as e:
            print(f"❌ Error getting chat analytics: {e}")
            return None

# Global Supabase logger instance
supabase_logger = SupabaseLogger()