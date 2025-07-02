/*
  # Create properties table for storing scraped property data

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `title` (text, property title)
      - `price` (text, property price as string)
      - `location` (text, property location)
      - `bedrooms` (integer, number of bedrooms)
      - `bathrooms` (integer, number of bathrooms)
      - `square_feet` (integer, property square footage)
      - `description` (text, property description)
      - `image_url` (text, property image URL)
      - `property_type` (text, type of property)
      - `listing_url` (text, original listing URL)
      - `scraped_at` (timestamp, when property was scraped)
      - `features` (text array, property features)
      - `agent_name` (text, agent name)
      - `agent_phone` (text, agent phone number)
      - `status` (text, property status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `properties` table
    - Add policies for authenticated users to manage properties
    - Add policy for anonymous users to read properties (for demo purposes)
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price text NOT NULL,
  location text NOT NULL,
  bedrooms integer,
  bathrooms integer,
  square_feet integer,
  description text,
  image_url text,
  property_type text,
  listing_url text NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  features text[],
  agent_name text,
  agent_phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_scraped_at ON properties(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view properties"
  ON properties
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties"
  ON properties
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties"
  ON properties
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();