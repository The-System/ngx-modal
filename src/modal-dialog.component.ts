﻿import {
  Component,
  ComponentRef,
  ComponentFactoryResolver,
  ViewContainerRef,
  ViewChild,
  ViewEncapsulation,
  OnDestroy
} from '@angular/core';
import {
  IModalDialog,
  IModalDialogOptions,
  IModalDialogButton,
  IModalDialogSettings
} from './modal-dialog.interface';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';

/**
 * Modal dialog component
 * Usage:
 *
 * Model properties are:
 *
 */
@Component({
  selector: 'modal-dialog',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [ngClass]="settings.overlayClass" (click)="(!actionButtons || !actionButtons.length) && close()"></div>
    <div [ngClass]="settings.modalClass">
      <div [ngClass]="[ showAlert ? settings.alertClass : '', settings.contentClass]">
        <div [ngClass]="settings.headerClass">
          <h4 [ngClass]="settings.headerTitleClass">{{title}}</h4>
          <button (click)="close()" *ngIf="!prompt" type="button"
            [title]="settings.closeButtonTitle"
            [ngClass]="settings.closeButtonClass">
          </button>
        </div>
        <div [ngClass]="settings.bodyClass">
          <i #modalDialogBody></i>
        </div>
        <div [ngClass]="settings.footerClass" *ngIf="actionButtons && actionButtons.length">
          <button *ngFor="let button of actionButtons" (click)="doAction(button.onAction)"
            [ngClass]='button.buttonClass || settings.buttonClass'>{{button.text}}</button>
        </div>
      </div>
    </div>
    `,
  host: {
    style: `
      @-moz-keyframes shake {
        from, to                { transform: translate3d(0, -50%, 0); }
        10%, 30%, 50%, 70%, 90% { transform: translate3d(-2rem, -50%, 0); }
        20%, 40%, 60%, 80%      { transform: translate3d(2rem, -50%, 0); }
      }
      @-webkit-keyframes shake {
        from, to                { transform: translate3d(0, -50%, 0); }
        10%, 30%, 50%, 70%, 90% { transform: translate3d(-2rem, -50%, 0); }
        20%, 40%, 60%, 80%      { transform: translate3d(2rem, -50%, 0); }
      }
      @keyframes shake {
        from, to                { transform: translate3d(0, -50%, 0); }
        10%, 30%, 50%, 70%, 90% { transform: translate3d(-2rem, -50%, 0); }
        20%, 40%, 60%, 80%      { transform: translate3d(2rem, -50%, 0); }
      }
      
      .modal {
        display: block;
        top: 50%;
        left: 50%;
        right: auto;
        bottom: auto;
        backface-visibility: hidden;
        overflow: visible;
      }
      .modal-content {
        left: -50%;
        transform: translateY(-50%);
      }
      .modal-content.shake {
        backface-visibility: hidden;
        -webkit-animation-duration: 0.5s;
        -moz-animation-duration: 0.5s;
        animation-duration: 0.5s;
        -webkit-animation-fill-mode: both;
        -moz-animation-fill-mode: both;
        animation-fill-mode: both;
        -webkit-animation-iteration-count: infinite;
        -moz-animation-iteration-count: infinite;
        animation-iteration-count: infinite;
        -webkit-animation-name: shake;
        -moz-animation-name: shake;
        animation-name: shake;
      }    
    `
  }
})
export class ModalDialogComponent implements IModalDialog, OnDestroy {
  @ViewChild('modalDialogBody', { read: ViewContainerRef })
  protected dynamicComponentTarget: ViewContainerRef;
  protected reference: ComponentRef<IModalDialog>;

  /** Modal dialog style settings */
  protected settings: IModalDialogSettings = {
    overlayClass: 'modal-backdrop fade show',
    modalClass: 'fade show modal',
    contentClass: 'modal-content',
    headerClass: 'modal-header',
    headerTitleClass: 'modal-title',
    closeButtonClass: 'close glyphicon glyphicon-remove',
    closeButtonTitle: 'CLOSE',
    bodyClass: 'modal-body',
    footerClass: 'modal-footer',
    alertClass: 'shake',
    alertDuration: 250,
    notifyWithAlert: true,
    buttonClass: 'btn btn-primary'
  };
  protected actionButtons: IModalDialogButton[];
  protected title: string;
  protected onClose: () => Promise<any> | Observable<any> | boolean;
  protected showAlert: boolean = false;

  private _inProgress = false;
  private _alertTimeout: number;

  /**
   * CTOR
   * @param componentFactoryResolver
   */
  constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

  /**
   * Initialize dialog with reference to instance and options
   * @param reference
   * @param options
   */
  dialogInit(reference: ComponentRef<IModalDialog>, options?: IModalDialogOptions) {
    this.reference = reference;

    // inject component
    if (options && options.childComponent) {
      let factory = this.componentFactoryResolver.resolveComponentFactory(options.childComponent);
      let componentRef = this.dynamicComponentTarget.createComponent(factory) as ComponentRef<IModalDialog>;
      let childInstance = componentRef.instance as IModalDialog;
      childInstance['dialogInit'](componentRef, options);

      (document.activeElement as HTMLElement).blur();
    }
    // set options
    this._setOptions(options);
  }

  doAction(action?: () => Promise<any> | Observable<any> | boolean) {
    // disable multi clicks
    if (this._inProgress) {
      return;
    }
    this._inProgress = true;
    this._closeIfSuccessful(action);
  }

  /**
   * Method to run on close
   * if prompt or onCancel are defiend, it will run them before destroying component
   */
  close() {
    if (this._inProgress) {
      return;
    }
    if (this.actionButtons && this.actionButtons.length) {
      return;
    }
    this._inProgress = true;

    if (this.onClose) {
      this._closeIfSuccessful(this.onClose);
      return;
    }
    this.reference.destroy();
    this._inProgress = false;
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy() {
    if (this._alertTimeout) {
      clearTimeout(this._alertTimeout);
      this._alertTimeout = null;
    }
  }

  /**
   * Pass options from dialog setup to component
   * @param  {IModalDialogOptions} options?
   */
  private _setOptions(options?: IModalDialogOptions) {

    if (options && options.onClose && options.actionButtons && options.actionButtons.length) {
      throw new Error(`OnClose callback and ActionButtons are not allowed to be defined on the same dialog.`);
    }
    // set references
    this.title = (options && options.title) || '';
    this.onClose = (options && options.onClose) || null;
    this.actionButtons = (options && options.actionButtons) || null;
    if (options && options.settings) {
      Object.assign(this.settings, options.settings);
    }
  }

  private _closeIfSuccessful(callback: () => Promise<any> | Observable<any> | boolean) {
    if (!callback) {
      return this._finalizeAndDestroy();
    }

    let response = callback();
    if (typeof response === 'boolean') {
      if (response) {
        return this._finalizeAndDestroy();
      }
      return this._triggerAlert();
    }
    if (response instanceof Promise) {
      response = Observable.fromPromise(<Promise<any>>response);
    }
    response.subscribe(() => {
      this._finalizeAndDestroy();
    }, () => {
      this._triggerAlert();
    });
  }

  private _finalizeAndDestroy() {
    this._inProgress = false;
    this.reference.destroy();
  }

  private _triggerAlert() {
    if (this.settings.notifyWithAlert) {
      this.showAlert = true;
      this._alertTimeout = window.setTimeout(() => {
        this.showAlert = false;
        this._inProgress = false;
        clearTimeout(this._alertTimeout);
        this._alertTimeout = null;
      }, this.settings.alertDuration);
    }
  }
}