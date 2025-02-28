require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key for admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  try {
    console.log('Creating tables in Supabase...');
    
    // Create twins table
    const { error: twinsError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.twins (
          id SERIAL PRIMARY KEY,
          auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL DEFAULT 'Anonymous',
          bio TEXT NOT NULL,
          spotify_url TEXT,
          letterboxd_url TEXT,
          letterboxd_data JSONB DEFAULT '{"status": "not_provided"}',
          spotify_data JSONB DEFAULT '{"status": "not_provided"}',
          twin_personality JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
      `
    });
    
    if (twinsError) {
      console.error('Error creating twins table:', twinsError);
    } else {
      console.log('Twins table created successfully');
    }
    
    // Create messages table
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.messages (
          id SERIAL PRIMARY KEY,
          twin_id INTEGER NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          is_user BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
      `
    });
    
    if (messagesError) {
      console.error('Error creating messages table:', messagesError);
    } else {
      console.log('Messages table created successfully');
    }
    
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.twins ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('RLS enabled successfully');
    }
    
    // Create RLS policies
    const { error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        -- 1. Users can view their own twins
        CREATE POLICY "Users can view their own twins" 
          ON public.twins 
          FOR SELECT 
          USING (auth.uid() = auth_user_id);

        -- 2. Users can create their own twins
        CREATE POLICY "Users can create their own twins" 
          ON public.twins 
          FOR INSERT 
          WITH CHECK (auth.uid() = auth_user_id);

        -- 3. Users can update their own twins
        CREATE POLICY "Users can update their own twins" 
          ON public.twins 
          FOR UPDATE 
          USING (auth.uid() = auth_user_id);

        -- 4. Users can delete their own twins
        CREATE POLICY "Users can delete their own twins" 
          ON public.twins 
          FOR DELETE 
          USING (auth.uid() = auth_user_id);

        -- 1. Users can view messages for their twins
        CREATE POLICY "Users can view messages for their twins" 
          ON public.messages 
          FOR SELECT 
          USING (
            EXISTS (
              SELECT 1 FROM public.twins 
              WHERE twins.id = messages.twin_id 
              AND twins.auth_user_id = auth.uid()
            )
          );

        -- 2. Users can create messages for their twins
        CREATE POLICY "Users can create messages for their twins" 
          ON public.messages 
          FOR INSERT 
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.twins 
              WHERE twins.id = messages.twin_id 
              AND twins.auth_user_id = auth.uid()
            )
          );

        -- 3. Users can delete messages for their twins
        CREATE POLICY "Users can delete messages for their twins" 
          ON public.messages 
          FOR DELETE 
          USING (
            EXISTS (
              SELECT 1 FROM public.twins 
              WHERE twins.id = messages.twin_id 
              AND twins.auth_user_id = auth.uid()
            )
          );
      `
    });
    
    if (policiesError) {
      console.error('Error creating RLS policies:', policiesError);
    } else {
      console.log('RLS policies created successfully');
    }
    
    // Create updated_at trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      query: `
        -- Create function to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger to update updated_at on twins table
        CREATE TRIGGER update_twins_updated_at
        BEFORE UPDATE ON public.twins
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (triggerError) {
      console.error('Error creating updated_at trigger:', triggerError);
    } else {
      console.log('Updated_at trigger created successfully');
    }
    
    // Enable realtime
    const { error: realtimeError } = await supabase.rpc('exec_sql', {
      query: `
        -- Enable realtime for messages table
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      `
    });
    
    if (realtimeError) {
      console.error('Error enabling realtime:', realtimeError);
    } else {
      console.log('Realtime enabled successfully');
    }
    
    // Create indexes
    const { error: indexesError } = await supabase.rpc('exec_sql', {
      query: `
        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_twins_auth_user_id ON public.twins(auth_user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_twin_id ON public.messages(twin_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
      `
    });
    
    if (indexesError) {
      console.error('Error creating indexes:', indexesError);
    } else {
      console.log('Indexes created successfully');
    }
    
    console.log('All tables and configurations created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables(); 