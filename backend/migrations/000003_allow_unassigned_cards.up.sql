-- Allow cards to exist without a business for pre-printed stock (Model B)
ALTER TABLE cards ALTER COLUMN business_id DROP NOT NULL;
