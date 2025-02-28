require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key for admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('Starting Supabase migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20240225_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL file loaded successfully');
    
    // Execute the SQL using Supabase's REST API
    const { error } = await supabase.rpc('pgmigrate', { query: migrationSQL });
    
    if (error) {
      console.error('Error executing migration:', error);
      
      // Alternative approach: split the SQL into individual statements
      console.log('Trying alternative approach with individual statements...');
      
      // Split the SQL into individual statements (simple approach)
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      console.log(`Executing ${statements.length} individual SQL statements...`);
      
      // Execute each statement separately
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('pgmigrate', { query: stmt });
        
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.log('Statement:', stmt);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      }
    } else {
      console.log('Migration executed successfully!');
    }
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Tables in public schema:', tables.map(t => t.tablename).join(', '));
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration(); 