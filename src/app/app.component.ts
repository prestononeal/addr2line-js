import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FileUploader } from 'ng2-file-upload/ng2-file-upload';

import { Observable } from 'rxjs/Rx';

const URL = '/api/';

export interface ITranslation {
  address: number;
  filename: string;
  function: string;
  line: number;
}

export interface IElfFile {
  md5: string;
  name: string;
}

export interface IAlert {
  type: string;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private uploader: FileUploader = new FileUploader({url: URL + 'elfs'});
  private title = 'addr2line-JS';
  private translateText = '';
  public alert: IAlert;
  private translateTimerSubscription = undefined;
  private elfAlerts = {
    none: {
      type: 'danger',
      message: 'You must upload an ELF file before translating'
    },
    uploading: {
      type: 'warning',
      message: 'Uploading ELF'
    },
    serverError: {
      type: 'danger',
      message: 'There was an error talking to the server'
    }
  };
  private currentElfFile: IElfFile;
  public hasFileOver:boolean = false; 

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.uploader = new FileUploader({url: URL + 'elfs'});
    this.uploader.onCompleteItem  = (item: any, resp: any, status: any, headers: any) => {
      console.log(item, resp, status);
      if (status == 200) {
        resp = JSON.parse(resp);
        this.currentElfFile = {
          md5: resp.id,
          name: item.file.name
        };
        // TODO: remove the Elf file upload warning
        console.log('Elf file to use: ', this.currentElfFile);

        // Now that we have an elf, try to translate our text
        this.alert = {
          type: 'info',
          message: `${this.currentElfFile.name} uploaded successfully, md5 = ${this.currentElfFile.md5}`
        };
        this.translate();  // If we uploaded an Elf file translate immediately

        // Clear the upload queue (Why isn't this done automatically by ng2-file-upload?)
        item.remove();
      } else {
        console.log('Error uploading elf file: ', status, resp);
        this.currentElfFile = undefined;
        this.alert = this.elfAlerts.serverError;
      }
    };
  }

  public fileOver(e:any):void {
    // Set to true if a file is hovering over the drop zone
    this.hasFileOver = e;
  }

  upload(event: Event) {
    console.log('upload(): ', event);
    this.uploader.queue.forEach(item => {
      let file = item['_file'];  // '_file' contains a File object. 'file' contains a FileLikeObject
      let fileType = file['name'].split('.').slice(-1)[0].toLowerCase();
      let index = this.uploader.queue.indexOf(item);

      if (fileType === 'elf') {
        // Go ahead and upload elfs to the API. 
        this.alert = this.elfAlerts.uploading;
      } else if (fileType === 'txt' || fileType === 'log') {
        // For text files, check if they can be written to the page
        let reader = new FileReader();
        reader.onload = () => {
          // reader.result contains the content of the file
          this.translateText = reader.result;
          
          this.translate();  // If we uploaded a text file, translate immediately
        };
        reader.readAsText(file);
        
        // Remove this from the upload queue
        this.uploader.queue.splice(index, 1);
      } else {
        this.alert = {
          type: 'danger',
          message: 'Unknown file uploaded'
        };

        // Remove from the upload queue
        this.uploader.queue.splice(index, 1);
      }
    });
    this.uploader.uploadAll();
  }

  cancelTranslateTimerSub() {
    // Cancel the current translate timer.
    // Either we typed in new text and want to reset the timer,
    //   or we're overriding the timer and forcing a translation.
    if (this.translateTimerSubscription !== undefined) {
      this.translateTimerSubscription.unsubscribe();
    }
  }
  
  translateTextChange() {
    console.log('Change, restarting timer');
    this.cancelTranslateTimerSub();
    this.translateTimerSubscription = Observable.timer(2 * 1000)  // Translate text a few seconds after someone stops typing
      .subscribe(() => {
        this.translateTimerSubscription = undefined;
        this.translate();
      });
  }

  translate() {
    this.cancelTranslateTimerSub();
    if (!this.currentElfFile) {
      if (!this.uploader.queue.length) {
        this.alert = this.elfAlerts.none;
      }
      return;
    }
    if (this.translateText === '') {
      // Nothing to do here
      return
    }
    let matches = this.translateText.match(/\b0x[0-9A-F]{8}\b/gi); // Regex to find hex addresses (eg: 0x64033A85)
    if (!matches || matches.length === 0) {
      // Nothing to do here
      return;
    }
    console.log(`translate(): translating ${matches} with ${this.currentElfFile.md5}`);
    this.http.get(URL + 'elf/' + this.currentElfFile.md5 + '/' + matches.join(','))
      .subscribe(resp => {
        let translations = <ITranslation[]>resp['results'];
        console.log('Got translations: ', translations);
        translations.forEach(tr => {
          if (tr === null) {
            // We can't always find translations
            return;
          }
          // Search and replace each address in the text
          // The signature will look like <file_name>:<line_number> (eg: "my_file.c::133")
          let signature = tr.filename.split('/').slice(-1)[0] + ':' + tr.line.toString() + ' ' + `(${tr.function})`;
          let hexAddr = '0x' + tr.address.toString(16);
          console.log(`Replacing ${hexAddr} with ${signature}`);
          // Do a case insensitive replace
          let replaceRegex = new RegExp(hexAddr, 'ig');
          this.translateText = this.translateText.replace(replaceRegex, signature);
        });
      })
  }
}
