import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Lead } from '../models/lead';

export interface ILeadsService {
  list(): Observable<readonly Lead[]>;
}

export const LEADS_SERVICE = new InjectionToken<ILeadsService>('ILeadsService');
