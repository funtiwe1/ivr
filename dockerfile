FROM centos:7
     RUN curl -o /root/setup_lts.x https://rpm.nodesource.com/setup_lts.x
     RUN bash /root/setup_lts.x
     RUN yum install -y nodejs
     RUN mkdir -p /root/ivr
     ADD ivr /root/ivr
     RUN chmod +x /root/ivr/index.js
     EXPOSE 80
     EXPOSE 443
     EXPOSE 3306
