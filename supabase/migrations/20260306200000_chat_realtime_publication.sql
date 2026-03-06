-- Enable Realtime for chat tables so postgres_changes subscriptions work
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
