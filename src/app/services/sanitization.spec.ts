import { TestBed } from '@angular/core/testing';

import { Sanitization } from './sanitization';

describe('Sanitization', () => {
  let service: Sanitization;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sanitization);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
