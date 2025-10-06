import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerificationRequiredPage } from './verification-required.page';

describe('VerificationRequiredPage', () => {
  let component: VerificationRequiredPage;
  let fixture: ComponentFixture<VerificationRequiredPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerificationRequiredPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
