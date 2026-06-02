import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { DealsModule } from './deals/deals.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    CompaniesModule,
    ContactsModule,
    PipelinesModule,
    DealsModule,
    ActivitiesModule,
    NotesModule,
  ],
})
export class CrmModule {}
