-- Deferred so moving a pay day can update both neighbouring cycles in one transaction.
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_no_overlap"
  EXCLUDE USING gist ("user_id" WITH =, daterange("start_date", "end_date", '[]') WITH &&)
  DEFERRABLE INITIALLY DEFERRED;
