import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { ILeadsService } from './leads.service.contract';
import { Lead } from '../models/lead';

@Injectable()
export class LeadsService implements ILeadsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<readonly Lead[]> {
    return this.http.get<readonly Lead[]>(`${this.baseUrl}/api/leads`);
  }
}
